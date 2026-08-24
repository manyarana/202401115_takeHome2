const statementInput =
    document.getElementById("statement");

const analyzeButton =
    document.getElementById("analyzeButton");

const analysisSection =
    document.getElementById("analysisSection");

const ambiguity =
    document.getElementById("ambiguity");

const question =
    document.getElementById("question");

const responseInput =
    document.getElementById("response");

const generateButton =
    document.getElementById("generateButton");

const requirementSection =
    document.getElementById("requirementSection");

const requirement =
    document.getElementById("requirement");

const type =
    document.getElementById("type");

const category =
    document.getElementById("category");

const evaluationSection =
    document.getElementById("evaluationSection");

const beforeClarity =
    document.getElementById("beforeClarity");

const beforeCompleteness =
    document.getElementById("beforeCompleteness");

const beforeTestability =
    document.getElementById("beforeTestability");

const beforeAmbiguity =
    document.getElementById("beforeAmbiguity");

const afterClarity =
    document.getElementById("afterClarity");

const afterCompleteness =
    document.getElementById("afterCompleteness");

const afterTestability =
    document.getElementById("afterTestability");

const afterAmbiguity =
    document.getElementById("afterAmbiguity");

const improvementSummary =
    document.getElementById("improvementSummary");

const status =
    document.getElementById("status");


let currentQuestion = "";


/* ----------------------------------
   Helper function for Gemini JSON
---------------------------------- */

function cleanJSON(text) {

    let cleaned = text.trim();

    // Remove ```json at the beginning
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.substring(7);
    }

    // Remove ``` at the beginning
    else if (cleaned.startsWith("```")) {
        cleaned = cleaned.substring(3);
    }

    // Remove ``` at the end
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(
            0,
            cleaned.length - 3
        );
    }

    return cleaned.trim();
}


/* ----------------------------------
   Analyze Requirement
---------------------------------- */

analyzeButton.addEventListener(
    "click",
    async () => {

        const statement =
            statementInput.value.trim();

        if (!statement) {

            status.textContent =
                "Please enter a stakeholder statement.";

            return;
        }

        status.textContent =
            "Analyzing requirement...";

        requirementSection.classList.add("hidden");
        evaluationSection.classList.add("hidden");

        try {

            const response = await fetch(
                "http://127.0.0.1:8000/analyze-requirement",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        statement: statement
                    })
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Analysis request failed."
                );
            }

            const data =
                await response.json();

            const cleaned =
                cleanJSON(data.analysis);

            const analysis =
                JSON.parse(cleaned);


            if (analysis.ambiguous) {

                ambiguity.textContent =
                    analysis.ambiguity;

                question.textContent =
                    analysis.clarification_question;

                currentQuestion =
                    analysis.clarification_question;

            } else {

                ambiguity.textContent =
                    "No significant ambiguity detected.";

                question.textContent =
                    "No clarification is required.";

                currentQuestion = "";
            }


            analysisSection.classList.remove(
                "hidden"
            );

            status.textContent = "";

        } catch (error) {

            console.error(
                "Analysis error:",
                error
            );

            status.textContent =
                "Could not analyze the requirement: "
                + error.message;
        }
    }
);


/* ----------------------------------
   Generate Refined Requirement
---------------------------------- */

generateButton.addEventListener(
    "click",
    async () => {

        const statement =
            statementInput.value.trim();

        const stakeholderResponse =
            responseInput.value.trim();


        if (!stakeholderResponse) {

            status.textContent =
                "Please enter the stakeholder response.";

            return;
        }


        if (!currentQuestion) {

            status.textContent =
                "No clarification question is available.";

            return;
        }


        status.textContent =
            "Generating refined requirement...";


        try {

            /* ------------------------------
               Generate refined requirement
            ------------------------------ */

            const response =
                await fetch(
                    "http://127.0.0.1:8000/generate-requirement",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            original_statement:
                                statement,

                            clarification_question:
                                currentQuestion,

                            stakeholder_response:
                                stakeholderResponse
                        })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Requirement generation failed."
                );
            }


            const data =
                await response.json();


            const cleaned =
                cleanJSON(data.result);


            const result =
                JSON.parse(cleaned);


            requirement.textContent =
                result.requirement;

            type.textContent =
                result.type;

            category.textContent =
                result.category;


            requirementSection.classList.remove(
                "hidden"
            );


            /* ------------------------------
               Evaluate Before vs After
            ------------------------------ */

            const evaluationResponse =
                await fetch(
                    "http://127.0.0.1:8000/evaluate-requirement",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            original_requirement:
                                statement,

                            refined_requirement:
                                result.requirement
                        })
                    }
                );


            if (!evaluationResponse.ok) {

                throw new Error(
                    "Evaluation request failed."
                );
            }


            const evaluationData =
                await evaluationResponse.json();


            const evaluationCleaned =
                cleanJSON(
                    evaluationData.evaluation
                );


            const evaluation =
                JSON.parse(
                    evaluationCleaned
                );


            /* ------------------------------
               Display Evaluation
            ------------------------------ */

            beforeClarity.textContent =
                evaluation.before.clarity;

            beforeCompleteness.textContent =
                evaluation.before.completeness;

            beforeTestability.textContent =
                evaluation.before.testability;

            beforeAmbiguity.textContent =
                evaluation.before.ambiguity;


            afterClarity.textContent =
                evaluation.after.clarity;

            afterCompleteness.textContent =
                evaluation.after.completeness;

            afterTestability.textContent =
                evaluation.after.testability;

            afterAmbiguity.textContent =
                evaluation.after.ambiguity;


            improvementSummary.textContent =
                evaluation.improvement_summary;


            evaluationSection.classList.remove(
                "hidden"
            );


            status.textContent = "";

        } catch (error) {

            console.error(
                "Generation error:",
                error
            );

            status.textContent =
                "Could not generate the requirement: "
                + error.message;
        }
    }
);