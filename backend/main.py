import os
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="AI Requirement Assistant",
    description="AI-assisted requirements engineering system",
    version="1.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# GEMINI CLIENT
# ============================================================

client = None

if api_key:
    client = genai.Client(
        api_key=api_key
    )


MODEL_NAME = "gemini-3.6-flash"


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def handle_ai_error(error):

    error_text = str(error)

    print("AI ERROR:")
    print(error_text)

    # Gemini quota / rate-limit error
    if (
        "429" in error_text
        or "RESOURCE_EXHAUSTED" in error_text
        or "quota" in error_text.lower()
    ):

        return JSONResponse(
            status_code=429,

            content={
                "error": "AI quota exhausted",

                "message":
                    "Gemini API quota has been exhausted. "
                    "Please wait for the quota to reset "
                    "or use a project with available quota."
            }
        )


    # API key problem
    if (
        "API key" in error_text
        or "authentication" in error_text.lower()
        or "unauthenticated" in error_text.lower()
    ):

        return JSONResponse(
            status_code=401,

            content={
                "error": "AI authentication error",

                "message":
                    "The Gemini API key is missing, invalid, "
                    "or not authorized."
            }
        )


    # General AI error
    return JSONResponse(
        status_code=500,

        content={
            "error": "AI service error",

            "message":
                "The AI service encountered an error."
        }
    )


def check_client():

    if client is None:

        return JSONResponse(
            status_code=500,

            content={
                "error": "Gemini API key missing",

                "message":
                    "GEMINI_API_KEY was not found in the environment."
            }
        )

    return None


def clean_json_response(text):

    """
    Gemini sometimes returns JSON wrapped in markdown
    even when asked not to.

    This function removes common markdown wrappers.
    """

    if not text:
        return text


    text = text.strip()


    if text.startswith("```json"):

        text = text[7:]


    elif text.startswith("```"):

        text = text[3:]


    if text.endswith("```"):

        text = text[:-3]


    return text.strip()


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message":
            "AI Requirement Assistant backend is running",

        "status":
            "success"
    }


# ============================================================
# CONNECTION TEST
# ============================================================

@app.get("/test")
def test_connection():

    return {
        "status": "success",

        "message":
            "Chrome Extension connected to backend!"
    }


# ============================================================
# AI CONNECTION TEST
# ============================================================

@app.get("/ai-test")
def ai_test():

    client_error = check_client()

    if client_error:
        return client_error


    prompt = (
        "Explain what a software requirement is "
        "in one sentence."
    )


    try:

        response = client.models.generate_content(

            model=MODEL_NAME,

            contents=prompt
        )


        return {
            "status": "success",

            "response":
                response.text
        }


    except Exception as error:

        return handle_ai_error(error)


# ============================================================
# REQUEST MODELS
# ============================================================

class RequirementInput(BaseModel):

    statement: str


class ClarificationInput(BaseModel):

    original_statement: str

    clarification_question: str

    stakeholder_response: str


class EvaluationInput(BaseModel):

    original_requirement: str

    refined_requirement: str


# ============================================================
# ANALYZE REQUIREMENT
# ============================================================

@app.post("/analyze-requirement")
def analyze_requirement(
    data: RequirementInput
):

    client_error = check_client()

    if client_error:
        return client_error


    prompt = f"""
You are an expert Software Requirements Engineer.

Analyze the following stakeholder statement:

"{data.statement}"

Your task is to identify ONLY genuine problems that make
the requirement unclear, vague, incomplete, or difficult
to test.

Important rules:

1. Do not invent problems that are not reasonably implied
   by the statement.

2. Do not require unnecessary implementation details.

3. A requirement is considered sufficiently clear if its
   main behavior and an important measurable constraint
   are specified.

4. For example:

"The system shall process each resume within 3 seconds."

should be considered CLEAR because it specifies an action
and a measurable performance constraint.

5. Only mark a requirement as ambiguous when clarification
would materially improve the requirement.

6. If the statement is clear enough, mark ambiguous as false.

Return ONLY valid JSON.

If ambiguous:

{{
    "ambiguous": true,
    "ambiguity": "Explain the genuine ambiguity.",
    "clarification_question":
        "Ask one specific clarification question."
}}

If sufficiently clear:

{{
    "ambiguous": false,
    "ambiguity": "",
    "clarification_question": ""
}}

Do not include markdown or additional text.
"""


    try:

        response = client.models.generate_content(

            model=MODEL_NAME,

            contents=prompt
        )


        analysis_text =
            clean_json_response(
                response.text
            )


        # Validate JSON before sending it
        try:

            json.loads(
                analysis_text
            )

        except json.JSONDecodeError:

            print(
                "Gemini returned invalid JSON:"
            )

            print(analysis_text)


        return {
            "analysis":
                analysis_text
        }


    except Exception as error:

        return handle_ai_error(error)


# ============================================================
# GENERATE REFINED REQUIREMENT
# ============================================================

@app.post("/generate-requirement")
def generate_requirement(
    data: ClarificationInput
):

    client_error = check_client()

    if client_error:
        return client_error


    prompt = f"""
You are an expert Software Requirements Engineer.

We have the following stakeholder statement:

"{data.original_statement}"

The clarification question asked was:

"{data.clarification_question}"

The stakeholder responded:

"{data.stakeholder_response}"

Using the original statement and clarification response,
generate ONE clear and testable software requirement.

Classify the requirement as either:

- FR (Functional Requirement)
- NFR (Non-Functional Requirement)

If it is an NFR, identify its category.

Possible NFR categories include:

Performance,
Security,
Reliability,
Fairness,
Usability,
Explainability,
Scalability,
or Other.

Return ONLY valid JSON in exactly this format:

{{
    "requirement":
        "The refined requirement.",

    "type":
        "FR or NFR",

    "category":
        "NFR category or Functional"
}}

The requirement should:

- be clear
- be specific
- avoid vague language
- be testable where possible
- use "The system shall..." wording

Do not include markdown or additional text.
"""


    try:

        response = client.models.generate_content(

            model=MODEL_NAME,

            contents=prompt
        )


        result_text =
            clean_json_response(
                response.text
            )


        try:

            json.loads(
                result_text
            )

        except json.JSONDecodeError:

            print(
                "Gemini returned invalid JSON:"
            )

            print(result_text)


        return {
            "result":
                result_text
        }


    except Exception as error:

        return handle_ai_error(error)


# ============================================================
# EVALUATE REQUIREMENT
# ============================================================

@app.post("/evaluate-requirement")
def evaluate_requirement(
    data: EvaluationInput
):

    client_error = check_client()

    if client_error:
        return client_error


    prompt = f"""
You are an expert Software Requirements Engineer.

Compare these two requirements.

BEFORE CLARIFICATION:

"{data.original_requirement}"


AFTER CLARIFICATION:

"{data.refined_requirement}"


Evaluate BOTH requirements on four quality dimensions:

1. Clarity
2. Completeness
3. Testability
4. Ambiguity

Use a score from 1 to 5.

Scoring rules:

Clarity:
1 = very unclear
5 = very clear

Completeness:
1 = highly incomplete
5 = sufficiently complete

Testability:
1 = difficult to verify objectively
5 = easily testable

Ambiguity:
1 = highly ambiguous
5 = very little ambiguity

Be reasonable and do not invent unnecessary problems.

Return ONLY valid JSON in exactly this structure:

{{
    "before": {{
        "clarity": 1,
        "completeness": 1,
        "testability": 1,
        "ambiguity": 1
    }},

    "after": {{
        "clarity": 1,
        "completeness": 1,
        "testability": 1,
        "ambiguity": 1
    }},

    "improvement_summary":
        "Briefly explain how the requirement improved."
}}

Do not include markdown or additional text.
"""


    try:

        response = client.models.generate_content(

            model=MODEL_NAME,

            contents=prompt
        )


        evaluation_text =
            clean_json_response(
                response.text
            )


        try:

            json.loads(
                evaluation_text
            )

        except json.JSONDecodeError:

            print(
                "Gemini returned invalid JSON:"
            )

            print(evaluation_text)


        return {
            "evaluation":
                evaluation_text
        }


    except Exception as error:

        return handle_ai_error(error)