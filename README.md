# Codex AI - Document Analysis Chat Application

Codex AI is a document analysis application that uses Retrieval-Augmented Generation (RAG) to provide intelligent responses to questions about uploaded PDF documents. The application allows users to upload PDFs, create chat sessions, and interact with the content using Google's Gemini AI.

## Features

- 📄 PDF document upload and processing
- 💬 Interactive chat interface with document context
- 🔍 Semantic search using FAISS vector database
- 🧠 Powered by Google's Gemini 2.0 Flash AI model
- 🔄 Multiple conversation modes (concise, balanced, detailed)
- 👤 User authentication system
- 📚 Session management for organizing document conversations

## Technology Stack

### Backend
- Python 3.10+
- Flask (Web framework)
- SQLAlchemy (ORM)
- LangChain (LLM framework)
- Google Gemini AI (LLM)
- FAISS (Vector database)
- PyPDF (PDF processing)

### Frontend
- React 18
- Vite (Build tool)
- Tailwind CSS (Styling)
- shadcn/ui (UI components)
- Lucide React (Icons)

## Prerequisites

- Python 3.10 or higher
- Node.js 16 or higher
- Google API key with access to Gemini models

## Setup Instructions

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/calvinsendawula/codex_ai.git
   cd codex_ai
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```
   GOOGLE_API_KEY=your_google_api_key
   GEMINI_MODEL_NAME=gemini-2.0-flash
   EMBEDDING_MODEL_NAME=models/embedding-001
   CHAT_HISTORY_WINDOW=10
   CHAT_LENGTH_WARNING=8
   CHAT_LENGTH_ALERT=15
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Initialize the database:
   ```bash
   python app.py
   ```
   This will create the SQLite database and tables, and a test user with credentials:
   - Email: test@example.com
   - Password: test123

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Start the Backend

1. From the backend directory:
   ```bash
   python app.py
   ```
   The backend server will start on http://localhost:5000

### Start the Frontend

1. From the frontend directory:
   ```bash
   npm run dev
   ```
   The frontend development server will start on http://localhost:5173

2. Open your browser and navigate to http://localhost:5173

## How It Works

### Architecture Overview

Codex AI uses a Retrieval-Augmented Generation (RAG) architecture that combines document retrieval with generative AI to provide accurate, contextual responses:

1. **Document Storage Layer**: PDF documents are processed and stored as vector embeddings
2. **Retrieval Layer**: Semantic search identifies relevant document sections
3. **Generation Layer**: Gemini AI generates responses based on retrieved context
4. **Presentation Layer**: React frontend displays conversations and manages user interactions

### Document Processing Flow

1. User uploads a PDF document through the frontend interface
2. Backend receives the file and processes it:
   - **Document Loading**: PyPDFLoader extracts text content from the PDF
   - **Text Chunking**: RecursiveCharacterTextSplitter divides text into manageable chunks (1000 characters with 200 character overlap)
   - **Embedding Generation**: Google's embedding model (`models/embedding-001`) converts text chunks into vector embeddings
   - **Vector Storage**: FAISS stores these embeddings in an efficient vector database for similarity search
   - **Session Association**: The document is associated with the user's session in the SQLite database

### Chat Flow in Detail

1. User sends a question about the document
2. Backend processes the query:
   - **Query Embedding**: The user's question is converted to a vector embedding
   - **Semantic Search**: FAISS retrieves the most relevant document chunks (top 4 by default) based on vector similarity
   - **Context Assembly**: The system combines:
     - Retrieved document chunks
     - User's question
     - Chat history (configurable window of previous exchanges)
     - System prompt (varies by conversation mode)
   - **LLM Query**: The assembled context is sent to Gemini AI (`gemini-2.0-flash` model)
   - **Response Generation**: Gemini generates a response based on the document context
   - **Storage**: Both the user's question and AI's response are stored in the database
   - **Return**: The response and source references are sent back to the frontend

3. Frontend displays the response:
   - Formats the markdown response
   - Updates the conversation history
   - Manages the chat count for context window warnings

### Conversation History Management

- **Window-Based Memory**: The system maintains a configurable window of conversation history (default: 10 messages)
- **Context Warnings**: Users receive warnings when conversations get long:
  - Initial warning at 8 exchanges
  - Strong recommendation to start a new chat at 15 exchanges
- **Database Storage**: All conversations are stored in SQLite for persistence

### Conversation Modes in Detail

- **Concise Mode**:
  - Uses a system prompt that instructs Gemini to provide brief, focused responses
  - Optimized for quick information retrieval
  - Formats responses in clean markdown with minimal explanation

- **Balanced Mode** (Default):
  - Uses a system prompt that balances detail with clarity
  - Provides well-structured explanations with appropriate context
  - Uses markdown formatting with headers, lists, and emphasis

- **Detailed Mode**:
  - Uses a system prompt that instructs Gemini to provide comprehensive analysis
  - Breaks down complex information into clear sections
  - Includes more extensive context and connections between concepts
  - Uses rich markdown formatting for better information hierarchy

### Authentication System

- **User Registration**: New users can register with email and password
- **Password Security**: Passwords are hashed and securely stored
- **Session Management**: Flask sessions track authenticated users
- **Access Control**: Protected routes ensure only authenticated users can access documents and chats

### Technical Implementation Details

- **Vector Similarity**: FAISS uses cosine similarity to find relevant document chunks
- **Database Schema**:
  - Users: Stores user credentials and profile information
  - Sessions: Groups documents and conversations
  - Documents: Tracks uploaded files
  - Chats: Stores conversation history
- **API Architecture**: RESTful endpoints handle document upload, chat, and session management
- **Frontend State Management**: React's useState and useEffect manage application state
- **Responsive Design**: Tailwind CSS provides responsive styling across devices

## Project Structure

```
codex_ai/
├── backend/
│   ├── app.py                # Main Flask application
│   ├── models.py             # Database models
│   └── vectorstores/         # FAISS vector databases
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── App.jsx           # Main application component
│   │   └── main.jsx          # Entry point
│   ├── public/               # Static assets
│   └── index.html            # HTML template
└── .env                      # Environment variables
```

## Troubleshooting

- **Backend won't start**: Ensure you have the correct Python version and all dependencies installed
- **Frontend won't start**: Check Node.js version and that all npm packages are installed
- **Chat not working**: Verify your Google API key has access to Gemini models
- **PDF upload fails**: Ensure the PDF is not corrupted and is a valid PDF file

## License

This project is a private repository and not meant to be shared.
