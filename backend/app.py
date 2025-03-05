from flask import Flask, request, jsonify, session as flask_session
from flask_cors import CORS
from dotenv import load_dotenv
import os
from langchain_google_genai import GoogleGenerativeAI
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, ChatPromptTemplate
import tempfile
from models import db, User, Session, Document, Chat
from sqlalchemy import text
from datetime import datetime
import shutil

app = Flask(__name__)
CORS(app, 
     supports_credentials=True,
     resources={
         r"/*": {
             "origins": ["http://localhost:5173"],
             "methods": ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "expose_headers": ["Content-Type"],
             "supports_credentials": True,
             "allow_credentials": True
         }
     })
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat_app.db'
app.config['SECRET_KEY'] = 'dev-key'  # Change in production
db.init_app(app)

# Load environment variables
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.0-flash")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "models/embedding-001")
CHAT_HISTORY_WINDOW = int(os.getenv("CHAT_HISTORY_WINDOW", 10))
CHAT_LENGTH_WARNING = int(os.getenv("CHAT_LENGTH_WARNING", 8))
CHAT_LENGTH_ALERT = int(os.getenv("CHAT_LENGTH_ALERT", 15))

# Initialize the models separately
llm = GoogleGenerativeAI(model=GEMINI_MODEL_NAME, google_api_key=GOOGLE_API_KEY)
embeddings = GoogleGenerativeAIEmbeddings(
    model=EMBEDDING_MODEL_NAME,
    google_api_key=GOOGLE_API_KEY
)

# Add these constants at the top of the file
CHAT_MODES = {
    'concise': """You are Codex, an AI assistant focused on document analysis. Provide brief, focused responses 
                 based on the provided documents. Format responses in markdown with clear structure.""",
    
    'balanced': """You are Codex, an AI assistant focused on document analysis. Provide clear, well-explained answers 
                  based on the provided documents. Use markdown formatting to structure responses with appropriate 
                  headers, lists, and emphasis.""",
    
    'detailed': """You are Codex, an AI assistant focused on document analysis. Provide comprehensive, detailed 
                  explanations based on the provided documents. Use markdown formatting with headers, lists, and 
                  emphasis to structure detailed responses. Break down complex information into clear sections."""
}

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400

        user = User(
            first_name=data['firstName'].strip(),
            last_name=data['lastName'].strip(),
            email=data['email'].strip()
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        
        flask_session['user_id'] = user.id
        return jsonify({
            'success': True,
            'user': {
                'firstName': user.first_name,
                'email': user.email
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        user = User.query.filter_by(email=data['email'].strip()).first()
        
        if user and user.check_password(data['password']):
            flask_session['user_id'] = user.id
            return jsonify({
                'success': True,
                'user': {
                    'firstName': user.first_name,
                    'email': user.email
                }
            }), 200
            
        return jsonify({'error': 'Invalid email or password'}), 401
        
    except Exception as e:
        print('Login error:', str(e))
        return jsonify({'error': 'Login failed'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    flask_session.clear()
    return jsonify({'success': True}), 200

@app.route('/check-auth', methods=['GET'])
def check_auth():
    return jsonify({'authenticated': 'user_id' in flask_session}), 200

# Protect routes that need auth
def auth_required(f):
    def wrapper(*args, **kwargs):
        if 'user_id' not in flask_session:
            return jsonify({'error': 'Not authenticated'}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

@app.route('/sessions', methods=['GET'])
@auth_required
def get_sessions():
    try:
        sessions = Session.query.filter_by(user_id=flask_session['user_id']).all()
        return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/sessions/new', methods=['POST'])
@auth_required
def create_session():
    try:
        user_id = flask_session['user_id']
        new_session = Session(user_id=user_id)
        db.session.add(new_session)
        db.session.commit()
        
        return jsonify({
            'session': {
                'id': new_session.id,
                'created_at': new_session.created_at.isoformat(),
                'documents': []
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/upload', methods=['POST'])
@auth_required
def upload_file():
    try:
        user_id = flask_session['user_id']
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        if not file.filename.endswith('.pdf'):
            return jsonify({'error': 'Only PDF files are allowed'}), 400

        # Create new session or use existing one
        session_id = request.form.get('session_id')
        if session_id:
            session = Session.query.filter_by(id=session_id, user_id=user_id).first()
            if not session:
                return jsonify({'error': 'Invalid session'}), 400
        else:
            session = Session(user_id=user_id)
            db.session.add(session)
            db.session.flush()

        # Save document info
        document = Document(
            filename=file.filename,
            session_id=session.id,
            uploaded_at=datetime.utcnow()
        )
        db.session.add(document)
        db.session.commit()

        # Process the file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            try:
                file.save(tmp_file.name)
                loader = PyPDFLoader(tmp_file.name)
                documents = loader.load()
                
                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200
                )
                texts = text_splitter.split_documents(documents)
                vectorstore = FAISS.from_documents(texts, embeddings)
                
                vectorstore_path = f"vectorstores/session_{session.id}"
                os.makedirs("vectorstores", exist_ok=True)
                vectorstore.save_local(vectorstore_path)
                
                return jsonify({
                    'success': True,
                    'session_id': session.id,
                    'document': {
                        'id': document.id,
                        'filename': document.filename,
                        'uploaded_at': document.uploaded_at.isoformat()
                    }
                }), 200

            except Exception as e:
                print(f"Error processing file: {str(e)}")
                db.session.rollback()
                return jsonify({'error': str(e)}), 500
            finally:
                try:
                    os.unlink(tmp_file.name)
                except:
                    pass

    except Exception as e:
        print(f"Upload error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
@auth_required
def chat():
    try:
        data = request.json
        message = data['message']
        session_id = data['session_id']
        chat_mode = data.get('mode', 'balanced')
        
        # Get the session
        session = Session.query.filter_by(id=session_id, user_id=flask_session['user_id']).first()
        if not session:
            return jsonify({'error': 'Invalid session'}), 400

        # Count actual conversation pairs
        chat_count = Chat.query.filter_by(session_id=session_id).count() // 2
        
        # Load previous chat history
        previous_chats = Chat.query.filter_by(session_id=session_id).order_by(Chat.created_at.desc()).limit(CHAT_HISTORY_WINDOW).all()
        chat_history = []
        for chat in reversed(previous_chats):
            chat_history.extend([
                ("human", chat.message),
                ("assistant", chat.response)
            ])

        # Initialize memory with configurable window size
        memory = ConversationBufferWindowMemory(
            k=CHAT_HISTORY_WINDOW,
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )

        # Load vectorstore for this session
        vectorstore_path = f"vectorstores/session_{session_id}"
        if not os.path.exists(vectorstore_path):
            return jsonify({'error': 'Session data not found'}), 400
            
        vectorstore = FAISS.load_local(
            vectorstore_path, 
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        # Get system message based on mode
        system_template = CHAT_MODES[chat_mode]
        system_message_prompt = SystemMessagePromptTemplate.from_template(system_template)
        
        # Create human message template
        human_template = """Document content:

{context}

Question: {question}

Previous conversation:
{chat_history}

Provide a direct analysis of the document content."""
        human_message_prompt = HumanMessagePromptTemplate.from_template(human_template)
        
        # Combine prompts
        chat_prompt = ChatPromptTemplate.from_messages([
            system_message_prompt,
            human_message_prompt
        ])
        
        # Create the chain with the chat prompt
        conversation_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=vectorstore.as_retriever(
                search_kwargs={"k": 4}
            ),
            memory=memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={
                "prompt": chat_prompt,
                "output_key": "answer"
            }
        )
        
        # Get response using invoke
        chain_response = conversation_chain.invoke({
            "question": message,
            "chat_history": chat_history
        })
        
        # Extract answer from response
        if not isinstance(chain_response, dict) or 'answer' not in chain_response:
            raise ValueError("Unexpected response format from conversation chain")
            
        answer = chain_response['answer']
        sources = chain_response.get('source_documents', [])

        # Store chat in database
        chat = Chat(
            message=message,
            response=answer,
            session_id=session_id,
            mode=chat_mode
        )
        db.session.add(chat)
        db.session.commit()
        
        return jsonify({
            'response': answer,
            'sources': [doc.page_content for doc in sources],
            'session': {
                'id': session_id,
                'name': session.name,
                'created_at': session.created_at.isoformat(),
                'documents': [{'id': d.id, 'filename': d.filename} for d in session.documents]
            },
            'mode': chat_mode,
            'chatCount': chat_count,
            'warningThreshold': CHAT_LENGTH_WARNING,
            'alertThreshold': CHAT_LENGTH_ALERT
        }), 200
        
    except Exception as e:
        print(f"Chat error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/check-user/<email>', methods=['GET'])
def check_user(email):
    user = User.query.filter_by(email=email).first()
    return jsonify({'exists': bool(user)}), 200

@app.route('/test-db', methods=['GET'])
def test_db():
    try:
        # Test database connection with proper SQL text wrapper
        db.session.execute(text('SELECT 1'))
        # Count users
        user_count = User.query.count()
        return jsonify({
            'status': 'success',
            'message': 'Database connection successful',
            'user_count': user_count
        }), 200
    except Exception as e:
        print("Database error:", str(e))  # Debug logging
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/sessions/<int:session_id>/documents', methods=['GET'])
@auth_required
def get_session_documents(session_id):
    try:
        session = Session.query.filter_by(id=session_id, user_id=flask_session['user_id']).first()
        if not session:
            return jsonify({'error': 'Session not found'}), 404
            
        documents = Document.query.filter_by(session_id=session_id).all()
        return jsonify({
            'documents': [{
                'id': doc.id,
                'filename': doc.filename,
                'uploaded_at': doc.uploaded_at.isoformat()
            } for doc in documents]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/sessions/<int:session_id>', methods=['PATCH'])
@auth_required
def update_session(session_id):
    try:
        session = Session.query.filter_by(id=session_id, user_id=flask_session['user_id']).first()
        if not session:
            return jsonify({'error': 'Session not found'}), 404
            
        data = request.json
        if 'name' in data:
            session.name = data['name']
            db.session.commit()
            
        return jsonify({
            'success': True,
            'session': {
                'id': session.id,
                'name': session.name,
                'created_at': session.created_at.isoformat(),
                'documents': [{'id': d.id, 'filename': d.filename} for d in session.documents]
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/sessions/<int:session_id>', methods=['DELETE'])
@auth_required
def delete_session(session_id):
    try:
        print(f"Attempting to delete session {session_id}")
        session = Session.query.filter_by(id=session_id, user_id=flask_session['user_id']).first()
        
        if not session:
            print(f"Session {session_id} not found")
            return jsonify({'error': 'Session not found'}), 404
            
        # Delete associated files
        vectorstore_path = f"vectorstores/session_{session_id}"
        if os.path.exists(vectorstore_path):
            try:
                print(f"Deleting vectorstore at {vectorstore_path}")
                shutil.rmtree(vectorstore_path)
                print("Vectorstore deleted successfully")
            except Exception as e:
                print(f"Error deleting vectorstore: {str(e)}")
                # Continue with deletion even if file deletion fails
        
        # Delete the session (this will cascade to documents and chats)
        print("Deleting session from database")
        db.session.delete(session)
        db.session.commit()
        print("Session deleted successfully")
            
        return jsonify({
            'success': True,
            'message': 'Session deleted successfully'
        }), 200
    except Exception as e:
        error_msg = str(e)
        print(f"Delete session error: {error_msg}")
        db.session.rollback()
        return jsonify({'error': error_msg}), 500

@app.route('/sessions/<int:session_id>/messages', methods=['GET'])
@auth_required
def get_session_messages(session_id):
    try:
        # Verify session belongs to user
        session = Session.query.filter_by(
            id=session_id, 
            user_id=flask_session['user_id']
        ).first()
        if not session:
            return jsonify({'error': 'Session not found'}), 404

        # Get messages for session
        messages = Chat.query.filter_by(session_id=session_id).order_by(Chat.created_at).all()
        
        return jsonify({
            'messages': [{
                'isUser': True,
                'text': chat.message,
                'mode': chat.mode
            } if i % 2 == 0 else {
                'isUser': False,
                'text': chat.response,
                'mode': chat.mode
            } for i, chat in enumerate(messages)],
            'chatCount': len(messages) // 2  # Count conversation pairs
        }), 200
        
    except Exception as e:
        print(f"Error fetching session messages: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("Database tables created successfully")
            
            # Check if we have any users
            user_count = User.query.count()
            print(f"Current user count: {user_count}")
            
            # Create a test user if no users exist
            if user_count == 0:
                test_user = User(
                    email="test@example.com",
                    first_name="Test",
                    last_name="User"
                )
                test_user.set_password("test123")
                db.session.add(test_user)
                db.session.commit()
                print("Created test user with email: test@example.com")
        except Exception as e:
            print("Database initialization error:", str(e))
    
    app.run(debug=True, port=5000) 