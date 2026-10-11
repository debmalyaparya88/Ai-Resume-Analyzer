# AI Resume Analyzer

An AI-powered web application that analyzes resumes, evaluates ATS compatibility, and helps users improve their resumes and prepare for interviews.

## Features

- Resume upload and analysis
- AI-powered resume feedback
- ATS score and improvement suggestions
- User authentication and session management
- Resume report storage using MongoDB
- Interview questions and preparation features

## Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** EJS, HTML, CSS, JavaScript
- **Database:** MongoDB Atlas, Mongoose
- **Authentication:** Express Session
- **AI Integration:** Gemini API

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/debmalyaparya88/Ai-Resume-Analyzer.git
   ```

2. Enter the project directory:

   ```bash
   cd Ai-Resume-Analyzer
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the project root:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_random_secret
   GEMINI_API_KEY=your_gemini_api_key
   PORT=3002
   ```

5. Start the application using the script configured in `package.json`:

   ```bash
   npm start
   ```

6. Open `http://localhost:3002` in your browser.

## Security

Never commit your `.env` file, API keys, database credentials, or private uploaded resumes to GitHub.

## Author

Debmalya
