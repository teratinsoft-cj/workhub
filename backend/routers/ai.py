from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from auth import get_current_active_user

load_dotenv()

router = APIRouter()

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class TaskRefinementRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    track_summary: Optional[str] = None

class TaskRefinementResponse(BaseModel):
    refined_title: Optional[str] = None
    refined_description: Optional[str] = None
    refined_track_summary: Optional[str] = None

def refine_with_gemini(prompt: str, content: str) -> str:
    """Use Gemini AI to refine task content"""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Please set GEMINI_API_KEY in environment variables."
        )
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=GEMINI_API_KEY)
        # Use gemini-2.5-flash for faster responses, or gemini-2.5-pro for better quality
        # Try gemini-2.5-flash first, fallback to gemini-2.5-pro if needed
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
        except Exception:
            model = genai.GenerativeModel('gemini-2.5-pro')
        
        full_prompt = f"{prompt}\n\nCurrent content:\n{content}\n\nPlease provide an improved, professional version:"
        
        response = model.generate_content(full_prompt)
        
        # Extract text from response
        if hasattr(response, 'text') and response.text:
            return response.text.strip()
        elif hasattr(response, 'candidates') and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                if len(candidate.content.parts) > 0:
                    return candidate.content.parts[0].text.strip()
        
        # If we can't extract text, return original content
        raise ValueError("Unable to extract text from Gemini API response")
            
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Google Generative AI library not installed. Please install: pip install google-generativeai"
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Gemini API Error: {str(e)}")
        print(f"Traceback: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Gemini API: {str(e)}"
        )

@router.post("/refine-task", response_model=TaskRefinementResponse)
def refine_task(
    request: TaskRefinementRequest,
    current_user = Depends(get_current_active_user)
):
    """
    Use Gemini AI to refine task title, description, and track summary.
    Returns improved versions of the provided content.
    """
    result = TaskRefinementResponse()
    
    if request.title:
        prompt = "You are a professional project management assistant. Refine this task title to be clear, concise, and professional. Keep it under 100 characters. Return ONLY the refined title, nothing else."
        try:
            result.refined_title = refine_with_gemini(prompt, request.title)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error refining title: {str(e)}")
    
    if request.description:
        prompt = "You are a professional project management assistant. Refine this task description to be clear, well-structured, and professional. Use bullet points or numbered lists if appropriate. Maintain all important technical details. Return ONLY the refined description, no explanations or additional text."
        try:
            result.refined_description = refine_with_gemini(prompt, request.description)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error refining description: {str(e)}")
    
    if request.track_summary:
        prompt = "You are a professional project management assistant. Refine this task summary (for invoice) to be clear, professional, and suitable for client presentation. It should accurately describe the work completed. Keep it concise but informative. Return ONLY the refined summary, no explanations or additional text."
        try:
            result.refined_track_summary = refine_with_gemini(prompt, request.track_summary)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error refining track summary: {str(e)}")
    
    return result

