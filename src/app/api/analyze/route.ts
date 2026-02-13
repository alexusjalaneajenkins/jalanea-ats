import { NextRequest, NextResponse } from 'next/server';
import { generateATSAnalysis } from '@/lib/ai/gemini';
import { parseATSAnalysisResponse } from '@/lib/ai/parseATSAnalysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resume, jobDescription, model } = body;

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Both resume and job description are required' },
        { status: 400 }
      );
    }

    if (resume.length < 50) {
      return NextResponse.json(
        { error: 'Resume seems too short. Please paste your full resume.' },
        { status: 400 }
      );
    }

    if (jobDescription.length < 50) {
      return NextResponse.json(
        { error: 'Job description seems too short. Please paste the full job posting.' },
        { status: 400 }
      );
    }

    let result;
    try {
      const response = await generateATSAnalysis(resume, jobDescription, model);
      result = parseATSAnalysisResponse(response);
    } catch (firstError) {
      // Retry once: model outputs can occasionally include malformed wrappers.
      console.error('Primary parse attempt failed, retrying once:', firstError);
      const retryResponse = await generateATSAnalysis(resume, jobDescription, model);
      try {
        result = parseATSAnalysisResponse(retryResponse);
      } catch (retryError) {
        console.error('Retry parse failed:', retryError);
        console.error('Retry raw response:', retryResponse);
        return NextResponse.json(
          { error: 'Failed to parse analysis. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('ATS Analysis Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
