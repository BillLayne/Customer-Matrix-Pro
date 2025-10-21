<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Customer Matrix Pro

An advanced insurance management application for Bill Layne Insurance Agency, powered by Google's Gemini AI. Features include unified search, portal access, PDF parsing, needs analysis, quote assistance, and task management.

## Features

- **AI-Powered Assistant**: Gemini AI integration for insurance-specific tasks
- **Quote Assistant**: Compare and analyze insurance quotes
- **PDF Parser**: Extract and analyze information from insurance documents
- **Needs Analysis**: Generate comprehensive insurance needs assessments
- **Task Matrix**: AI-powered task management and prioritization
- **Quick Search**: Unified search across carriers and resources
- **Favorites & Portals**: Quick access to frequently used resources

## Prerequisites

- Node.js (v16 or higher recommended)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Customer-Matrix-Pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your API key**

   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

   **Important**: Never commit your `.env.local` file to version control. It's already included in `.gitignore`.

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

5. **Build for production**
   ```bash
   npm run build
   ```

## Deployment

### Netlify

1. Connect your GitHub repository to Netlify
2. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variable in Netlify dashboard:
   - Key: `GEMINI_API_KEY`
   - Value: Your Gemini API key

### Other Platforms

For other hosting platforms (Vercel, Railway, etc.), ensure you:
- Set the `GEMINI_API_KEY` environment variable
- Configure the build command as `npm run build`
- Set the output directory to `dist`

## Technology Stack

- **Frontend**: React 19, TypeScript
- **AI**: Google Gemini API (@google/genai)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (via CDN)

## Agency Information

Bill Layne Insurance Agency
1283 N Bridge ST, Elkin NC 28621
Phone: 336-835-1993
Email: save@billlayneinsurance.com
Website: BillLayneInsurance.com

**Key Carriers**: Nationwide, Progressive, National General, Alamance, Foremost, Travelers, NC Grange
