console.log("AI Requirement Assistant content script loaded.");

// ============================================================
// GLOBAL STATE
// ============================================================

let lastCaption = "";
let stableCaption = "";
let captionTimer = null;
let lastAnalyzedCaption = "";

let currentRequirement = "";
let currentClarificationQuestion = "";
let currentAnalysis = null;
let currentRefinedRequirement = null;
let requirementsHistory = [];


// ============================================================
// INITIALIZE
// ============================================================

addAssistantStyles();
createAssistantPanel();


// ============================================================
// CREATE UI PANEL
// ============================================================

function createAssistantPanel() {

    if (document.getElementById("ai-requirement-assistant")) {
        return;
    }

    const panel = document.createElement("div");

    panel.id = "ai-requirement-assistant";

    panel.innerHTML = `
        <div id="ai-ra-header">
            🤖 AI Requirement Assistant
        </div>

        <div id="ai-ra-content">

            <div class="ai-ra-section">
                <strong>Requirement detected</strong>

                <div id="ai-ra-requirement">
                    Waiting for requirement...
                </div>
            </div>


            <div id="ai-ra-analysis"></div>


            <div id="ai-ra-question"></div>


            <div id="ai-ra-response-section"
                 style="display:none;">

                <strong>Stakeholder Response</strong>

                <textarea
                    id="ai-ra-response"
                    placeholder="Enter stakeholder response..."
                ></textarea>

                <button id="ai-ra-submit">
                    Submit Response
                </button>

            </div>


            <div id="ai-ra-refined"></div>


            <div id="ai-ra-evaluation"></div>
            <div id="ai-ra-dashboard"></div>
            <div id="ai-ra-history"></div>
            <div id="ai-ra-export-section"
                style="display:none; margin-top:15px;">

                <button
                    id="ai-ra-export"
                    class="ai-ra-button">
                    📥 Export Requirements
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(panel);


    document
        .getElementById("ai-ra-submit")
        .addEventListener(
            "click",
            submitStakeholderResponse
        );
    document
        .getElementById("ai-ra-export")
        .addEventListener(
            "click",
            exportRequirements
        );
}


// ============================================================
// UI STYLES
// ============================================================

function addAssistantStyles() {

    if (document.getElementById("ai-ra-styles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "ai-ra-styles";

    style.textContent = `

        #ai-requirement-assistant {

            position: fixed;

            top: 80px;

            right: 20px;

            width: 380px;

            max-height: 80vh;

            overflow-y: auto;

            background: white;

            color: #202124;

            border-radius: 14px;

            box-shadow:
                0 4px 20px rgba(0,0,0,0.3);

            z-index: 999999;

            font-family:
                Arial,
                sans-serif;
        }


        #ai-ra-header {

            background: #1a73e8;

            color: white;

            padding: 15px;

            font-size: 17px;

            font-weight: bold;

            position: sticky;

            top: 0;
        }


        #ai-ra-content {

            padding: 16px;
        }


        .ai-ra-section {

            margin-bottom: 15px;
        }


        #ai-ra-requirement {

            margin-top: 7px;

            padding: 10px;

            background: #f1f3f4;

            border-radius: 8px;

            line-height: 1.4;
        }


        #ai-ra-analysis {

            margin-top: 12px;

            padding: 11px;

            background: #fff3cd;

            border-radius: 8px;

            line-height: 1.4;
        }


        #ai-ra-question {

            margin-top: 12px;

            padding: 11px;

            background: #e8f0fe;

            border-radius: 8px;

            line-height: 1.4;
        }


        #ai-ra-response-section {

            margin-top: 15px;

            padding-top: 10px;
        }


        #ai-ra-response {

            width: 100%;

            min-height: 80px;

            margin-top: 8px;

            padding: 9px;

            box-sizing: border-box;

            border: 1px solid #ccc;

            border-radius: 7px;

            resize: vertical;

            font-family: Arial, sans-serif;
        }


        #ai-ra-submit {

            width: 100%;

            margin-top: 8px;

            padding: 10px;

            border: none;

            border-radius: 7px;

            background: #1a73e8;

            color: white;

            cursor: pointer;

            font-weight: bold;
        }


        #ai-ra-submit:hover {

            background: #1557b0;
        }


        #ai-ra-refined {

            margin-top: 15px;
        }


        #ai-ra-evaluation {

            margin-top: 15px;
        }


        .ai-ra-success {

            padding: 11px;

            background: #e6f4ea;

            border-radius: 8px;

            line-height: 1.5;
        }


        .ai-ra-error {

            padding: 11px;

            background: #fce8e6;

            border-radius: 8px;

            color: #b3261e;

            line-height: 1.4;
        }


        .ai-ra-button {

            width: 100%;

            margin-top: 8px;

            padding: 9px;

            border: none;

            border-radius: 7px;

            background: #34a853;

            color: white;

            cursor: pointer;

            font-weight: bold;
        }


        .ai-ra-button:hover {

            background: #188038;
        }


        .ai-ra-score {

            margin-top: 5px;
        }

    `;

    document.head.appendChild(style);
}


// ============================================================
// GET MEET CAPTION
// ============================================================

function getCaptionText() {

    const text =
        document.body.innerText || "";

    /*
        Google Meet's caption text appears after
        the speaker label "You".

        We deliberately avoid relying on Meet's
        internal CSS class names.
    */

    const youIndex =
        text.lastIndexOf("\nYou\n");


    if (youIndex === -1) {

        return "";
    }


    let caption =
        text.substring(
            youIndex + 5
        );


    const stopWords = [

        "\nmic",

        "\nmic_off",

        "\nvideocam",

        "\nvideocam_off",

        "\ncomputer_arrow_up",

        "\nShare screen",

        "\nmore_vert",

        "\nMore options",

        "\ncall_end",

        "\nLeave call"
    ];


    for (const stopWord of stopWords) {

        const index =
            caption.indexOf(stopWord);


        if (index !== -1) {

            caption =
                caption.substring(
                    0,
                    index
                );
        }
    }


    return caption.trim();
}


// ============================================================
// ANALYZE REQUIREMENT
// ============================================================

async function analyzeRequirement(statement) {

    console.log(
        "Sending requirement to backend:"
    );

    console.log(statement);


    try {

        const response =
            await fetch(
                "http://127.0.0.1:8000/analyze-requirement",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        statement:
                            statement
                    })
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Backend returned ${response.status}: ${errorText}`
            );
        }


        const result =
            await response.json();


        console.log(
            "AI ANALYSIS RESULT:"
        );

        console.log(result);


        displayAnalysis(
            statement,
            result
        );

    }

    catch (error) {

        console.error(
            "Failed to connect to AI backend:",
            error
        );


        displayBackendError(
            error.message
        );
    }
}


// ============================================================
// DISPLAY AI ANALYSIS
// ============================================================

function displayEvaluation(result) {

    const evaluationBox =
        document.getElementById(
            "ai-ra-evaluation"
        );

    let evaluation;

    try {

        evaluation =
            typeof result.evaluation === "string"
                ? JSON.parse(result.evaluation)
                : result.evaluation;

        if (requirementsHistory.length > 0) {

            const lastRequirement =
                requirementsHistory[
                    requirementsHistory.length - 1
                ];

            lastRequirement.evaluation =
                evaluation;
        }
    } catch (error) {

        evaluationBox.innerHTML = `

            <div class="ai-ra-error">

                <strong>
                    Could not read evaluation
                </strong>

                <br><br>

                ${escapeHtml(
                    result.evaluation
                )}

            </div>
        `;

        return;
    }
    if (requirementsHistory.length > 0) {

        const lastRequirement =
            requirementsHistory[
                requirementsHistory.length - 1
            ];

        lastRequirement.evaluation =
            evaluation;

        displayDashboard();
    }

    const before =
        evaluation.before;

    const after =
        evaluation.after;


    const dimensions = [
        "clarity",
        "completeness",
        "testability",
        "ambiguity"
    ];


    let beforeTotal = 0;
    let afterTotal = 0;


    dimensions.forEach(
        dimension => {

            beforeTotal +=
                Number(
                    before[dimension]
                );

            afterTotal +=
                Number(
                    after[dimension]
                );
        }
    );


    const beforeAverage =
        (
            beforeTotal /
            dimensions.length
        ).toFixed(2);


    const afterAverage =
        (
            afterTotal /
            dimensions.length
        ).toFixed(2);


    const improvement =
        beforeAverage > 0
            ? (
                (
                    (
                        afterAverage -
                        beforeAverage
                    ) /
                    beforeAverage
                ) * 100
            ).toFixed(1)
            : 0;


    evaluationBox.innerHTML = `

        <div style="
            margin-top:15px;
            padding:12px;
            background:#f8f9fa;
            border-radius:10px;
        ">

            <strong>
                📊 Before vs After Quality
            </strong>


            <div style="
                margin-top:12px;
                overflow-x:auto;
            ">

                <table style="
                    width:100%;
                    border-collapse:collapse;
                    font-size:13px;
                ">

                    <tr>
                        <th style="
                            text-align:left;
                            padding:7px;
                        ">
                            Metric
                        </th>

                        <th style="
                            padding:7px;
                        ">
                            Before
                        </th>

                        <th style="
                            padding:7px;
                        ">
                            After
                        </th>
                    </tr>


                    <tr>
                        <td style="padding:7px;">
                            Clarity
                        </td>

                        <td style="padding:7px;">
                            ${before.clarity}/5
                        </td>

                        <td style="padding:7px;">
                            ${after.clarity}/5
                        </td>
                    </tr>


                    <tr>
                        <td style="padding:7px;">
                            Completeness
                        </td>

                        <td style="padding:7px;">
                            ${before.completeness}/5
                        </td>

                        <td style="padding:7px;">
                            ${after.completeness}/5
                        </td>
                    </tr>


                    <tr>
                        <td style="padding:7px;">
                            Testability
                        </td>

                        <td style="padding:7px;">
                            ${before.testability}/5
                        </td>

                        <td style="padding:7px;">
                            ${after.testability}/5
                        </td>
                    </tr>


                    <tr>
                        <td style="padding:7px;">
                            Ambiguity
                        </td>

                        <td style="padding:7px;">
                            ${before.ambiguity}/5
                        </td>

                        <td style="padding:7px;">
                            ${after.ambiguity}/5
                        </td>
                    </tr>

                </table>

            </div>


            <div style="
                margin-top:12px;
                padding:10px;
                background:#e8f0fe;
                border-radius:8px;
            ">

                <strong>
                    Overall Score
                </strong>

                <br><br>

                Before:
                ${beforeAverage}/5

                <br>

                After:
                ${afterAverage}/5

            </div>


            <div style="
                margin-top:10px;
                padding:10px;
                background:#e6f4ea;
                border-radius:8px;
            ">

                <strong>
                    📈 Improvement:
                    ${improvement}%
                </strong>

                <br><br>

                ${escapeHtml(
                    evaluation.improvement_summary
                )}

            </div>

        </div>
    `;
}
function addToRequirementsHistory() {

    if (!currentRefinedRequirement) {
        return;
    }

    const alreadyExists =
        requirementsHistory.some(
            item =>
                item.requirement ===
                currentRefinedRequirement.requirement
    );

    if (alreadyExists) {
        return;
    }
    const type =
        currentRefinedRequirement.type;

    const sameTypeCount =
        requirementsHistory.filter(
            item => item.type === type
        ).length;

    const requirementNumber =
            sameTypeCount + 1;


    requirementsHistory.push({

        id:
            `${type}${requirementNumber}`,

        original_statement:
            currentRequirement,

        ambiguity:
            currentAnalysis
                ? currentAnalysis.ambiguity
                : "",

        clarification_question:
            currentClarificationQuestion,

        stakeholder_response:
            document.getElementById(
                "ai-ra-response"
            )?.value.trim() || "",

        refined_requirement:
            currentRefinedRequirement.requirement,

        type:
            type,

        category:
            currentRefinedRequirement.category,

        evaluation:
            null
    });
    displayRequirementsHistory();
    displayDashboard();

    const exportSection =
        document.getElementById(
            "ai-ra-export-section"
        );

    if (exportSection) {

        exportSection.style.display =
            "block";
    }
}

function displayRequirementsHistory() {

    const historyBox =
        document.getElementById("ai-ra-history");

    if (!historyBox) {
        return;
    }

    if (requirementsHistory.length === 0) {
        historyBox.innerHTML = "";
        return;
    }

    let html = `
        <div style="
            margin-top:18px;
            padding-top:12px;
            border-top:1px solid #ddd;
        ">
            <strong>📋 Requirements History</strong>
    `;

    requirementsHistory.forEach(
        (item, index) => {

            html += `
                <div style="
                    margin-top:10px;
                    padding:10px;
                    background:#f8f9fa;
                    border-radius:8px;
                ">
                    <strong>
                        ${escapeHtml(item.id)}
                    </strong>

                    <br>

                    ${escapeHtml(
                        item.requirement
                    )}

                    <br>

                    <small>
                        Category:
                        ${escapeHtml(
                            item.category
                        )}
                    </small>
                </div>
            `;
        }
    );

    html += `</div>`;

    historyBox.innerHTML = html;
}

function displayDashboard() {

    const dashboard =
        document.getElementById(
            "ai-ra-dashboard"
        );

    if (!dashboard) {
        return;
    }

    const total =
        requirementsHistory.length;

    if (total === 0) {
        dashboard.innerHTML = "";
        return;
    }

    const functionalCount =
        requirementsHistory.filter(
            item => item.type === "FR"
        ).length;

    const nonFunctionalCount =
        requirementsHistory.filter(
            item => item.type === "NFR"
        ).length;


    const categories = {};

    requirementsHistory.forEach(
        item => {

            const category =
                item.category || "Other";

            categories[category] =
                (categories[category] || 0) + 1;
        }
    );


    let evaluatedRequirements =
        requirementsHistory.filter(
            item => item.evaluation
        );


    let beforeAverage = null;
    let afterAverage = null;


    if (evaluatedRequirements.length > 0) {

        let beforeTotal = 0;
        let afterTotal = 0;

        let scoreCount = 0;


        evaluatedRequirements.forEach(
            item => {

                const before =
                    item.evaluation.before;

                const after =
                    item.evaluation.after;


                const beforeScores = [
                    before.clarity,
                    before.completeness,
                    before.testability,
                    before.ambiguity
                ];

                const afterScores = [
                    after.clarity,
                    after.completeness,
                    after.testability,
                    after.ambiguity
                ];


                beforeScores.forEach(
                    score => {
                        beforeTotal +=
                            Number(score);
                    }
                );


                afterScores.forEach(
                    score => {
                        afterTotal +=
                            Number(score);
                    }
                );


                scoreCount += 4;
            }
        );


        beforeAverage =
            (
                beforeTotal /
                scoreCount
            ).toFixed(2);


        afterAverage =
            (
                afterTotal /
                scoreCount
            ).toFixed(2);
    }


    let categoryHTML = "";

    Object.entries(categories)
        .forEach(
            ([category, count]) => {

                categoryHTML += `
                    <div style="
                        margin-top:5px;
                    ">
                        ${escapeHtml(category)}:
                        <strong>${count}</strong>
                    </div>
                `;
            }
        );


    dashboard.innerHTML = `

        <div style="
            margin-top:15px;
            padding:12px;
            background:#f8f9fa;
            border-radius:10px;
        ">

            <strong>
                📊 Requirements Dashboard
            </strong>


            <div style="
                display:grid;
                grid-template-columns:
                    1fr 1fr 1fr;
                gap:7px;
                margin-top:10px;
            ">

                <div style="
                    padding:8px;
                    background:white;
                    border-radius:7px;
                    text-align:center;
                ">
                    <strong>
                        ${total}
                    </strong>
                    <br>
                    <small>
                        Total
                    </small>
                </div>


                <div style="
                    padding:8px;
                    background:white;
                    border-radius:7px;
                    text-align:center;
                ">
                    <strong>
                        ${functionalCount}
                    </strong>
                    <br>
                    <small>
                        FR
                    </small>
                </div>


                <div style="
                    padding:8px;
                    background:white;
                    border-radius:7px;
                    text-align:center;
                ">
                    <strong>
                        ${nonFunctionalCount}
                    </strong>
                    <br>
                    <small>
                        NFR
                    </small>
                </div>

            </div>


            <div style="
                margin-top:12px;
            ">

                <strong>
                    NFR Categories
                </strong>

                ${categoryHTML}

            </div>


            ${
                beforeAverage !== null
                ? `
                    <div style="
                        margin-top:12px;
                        padding:9px;
                        background:#e8f0fe;
                        border-radius:7px;
                    ">

                        <strong>
                            Quality Scores
                        </strong>

                        <br><br>

                        Before:
                        ${beforeAverage}/5

                        <br>

                        After:
                        ${afterAverage}/5

                    </div>
                `
                : ""
            }

        </div>
    `;
}
function exportRequirements() {

    if (requirementsHistory.length === 0) {

        alert(
            "No requirements available to export."
        );

        return;
    }


    const exportData = {

        project:
            "AI Requirement Assistant",

        description:
            "AI-assisted requirements engineering " +
            "results from a live meeting.",

        exported_at:
            new Date().toISOString(),

        total_requirements:
            requirementsHistory.length,

        requirements:
            requirementsHistory
    };


    const json =
        JSON.stringify(
            exportData,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href = url;

    link.download =
        "AI_Requirement_Assistant_Requirements.json";


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );
    alert(
    "Requirements exported successfully!"
    );
}

// ============================================================
// SUBMIT STAKEHOLDER RESPONSE
// ============================================================

async function submitStakeholderResponse() {

    const responseBox =
        document.getElementById(
            "ai-ra-response"
        );


    const responseText =
        responseBox.value.trim();


    if (!responseText) {

        alert(
            "Please enter the stakeholder response."
        );

        return;
    }


    if (
        !currentRequirement ||
        !currentClarificationQuestion
    ) {

        alert(
            "No clarification question is available."
        );

        return;
    }


    console.log(
        "Generating refined requirement..."
    );


    try {

        const response =
            await fetch(
                "http://127.0.0.1:8000/generate-requirement",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        original_statement:
                            currentRequirement,

                        clarification_question:
                            currentClarificationQuestion,

                        stakeholder_response:
                            responseText
                    })
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Backend returned ${response.status}: ${errorText}`
            );
        }


        const result =
            await response.json();


        console.log(
            "REFINED REQUIREMENT RESULT:"
        );

        console.log(result);


        displayRefinedRequirement(
            result
        );

    }

    catch (error) {

        console.error(
            "Failed to generate refined requirement:",
            error
        );


        document.getElementById(
            "ai-ra-refined"
        ).innerHTML = `

            <div class="ai-ra-error">

                <strong>
                    Could not generate refined requirement
                </strong>

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;
    }
}


// ============================================================
// DISPLAY REFINED REQUIREMENT
// ============================================================

function displayRefinedRequirement(
    result
) {

    const resultBox =
        document.getElementById(
            "ai-ra-refined"
        );


    let refined;


    try {

        refined =
            typeof result.result === "string"
                ? JSON.parse(
                    result.result
                )
                : result.result;

    }

    catch (error) {

        resultBox.innerHTML = `

            <div class="ai-ra-success">

                <strong>
                    ✅ Refined Requirement
                </strong>

                <br><br>

                ${escapeHtml(
                    result.result
                )}

            </div>
        `;

        return;
    }


    currentRefinedRequirement =
        refined;
    addToRequirementsHistory();


    resultBox.innerHTML = `

        <div class="ai-ra-success">

            <strong>
                ✅ Refined Requirement
            </strong>


            <div style="
                margin-top:8px;
                padding:10px;
                background:white;
                border-radius:7px;
            ">

                ${escapeHtml(
                    refined.requirement
                )}

            </div>


            <div style="margin-top:10px;">

                <strong>
                    Type:
                </strong>

                ${escapeHtml(
                    refined.type
                )}

            </div>


            <div style="margin-top:6px;">

                <strong>
                    Category:
                </strong>

                ${escapeHtml(
                    refined.category
                )}

            </div>

        </div>


        <button
            class="ai-ra-button"
            id="ai-ra-evaluate-button"
        >
            📊 Evaluate Before vs After
        </button>
    `;


    document
        .getElementById(
            "ai-ra-evaluate-button"
        )
        .addEventListener(
            "click",
            evaluateRequirement
        );
}


// ============================================================
// EVALUATE REQUIREMENT
// ============================================================

async function evaluateRequirement() {

    const evaluationBox =
        document.getElementById(
            "ai-ra-evaluation"
        );


    if (
        !currentRequirement ||
        !currentRefinedRequirement
    ) {

        return;
    }


    evaluationBox.innerHTML = `

        <div class="ai-ra-question">

            ⏳ Evaluating requirement quality...

        </div>
    `;


    try {

        const response =
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
                            currentRequirement,

                        refined_requirement:
                            currentRefinedRequirement
                                .requirement
                    })
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Backend returned ${response.status}: ${errorText}`
            );
        }


        const result =
            await response.json();


        console.log(
            "REQUIREMENT EVALUATION:"
        );

        console.log(result);


        displayEvaluation(
            result
        );

    }

    catch (error) {

        console.error(
            "Evaluation failed:",
            error
        );


        evaluationBox.innerHTML = `

            <div class="ai-ra-error">

                <strong>
                    Evaluation failed
                </strong>

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;
    }
}


// ============================================================
// DISPLAY EVALUATION
// ============================================================

function displayEvaluation(
    result
) {

    const evaluationBox =
        document.getElementById(
            "ai-ra-evaluation"
        );


    let evaluation;


    try {

        evaluation =
            typeof result.evaluation === "string"
                ? JSON.parse(
                    result.evaluation
                )
                : result.evaluation;

    }

    catch (error) {

        evaluationBox.innerHTML = `

            <div class="ai-ra-error">

                ${escapeHtml(
                    result.evaluation
                )}

            </div>
        `;

        return;
    }


    evaluationBox.innerHTML = `

        <div class="ai-ra-success">

            <strong>
                📊 Requirement Quality
            </strong>


            <div class="ai-ra-score">

                <strong>
                    Clarity:
                </strong>

                ${evaluation.clarity}/5

            </div>


            <div class="ai-ra-score">

                <strong>
                    Completeness:
                </strong>

                ${evaluation.completeness}/5

            </div>


            <div class="ai-ra-score">

                <strong>
                    Testability:
                </strong>

                ${evaluation.testability}/5

            </div>


            <div class="ai-ra-score">

                <strong>
                    Ambiguity:
                </strong>

                ${evaluation.ambiguity}/5

            </div>


            <hr>


            <strong>
                Improvement
            </strong>

            <div style="margin-top:6px;">

                ${escapeHtml(
                    evaluation.improvement
                )}

            </div>

        </div>
    `;
}


// ============================================================
// BACKEND ERROR
// ============================================================

function displayBackendError(
    message
) {

    const analysisBox =
        document.getElementById(
            "ai-ra-analysis"
        );


    analysisBox.innerHTML = `

        <div class="ai-ra-error">

            <strong>
                ⚠ AI service unavailable
            </strong>

            <br><br>

            The requirement was detected,
            but the AI backend could not
            analyze it.

            <br><br>

            ${escapeHtml(message)}

        </div>
    `;
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";
    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// MONITOR MEET CAPTIONS
// ============================================================

function checkCaption() {

    const caption =
        getCaptionText();


    if (!caption) {

        return;
    }


    if (caption !== lastCaption) {

        lastCaption =
            caption;


        console.log(
            "LIVE CAPTION:"
        );

        console.log(
            caption
        );


        clearTimeout(
            captionTimer
        );


        captionTimer =
            setTimeout(
                () => {

                    if (
                        caption ===
                        lastCaption
                    ) {

                        if (
                            caption !==
                            stableCaption
                        ) {

                            stableCaption =
                                caption;


                            console.log(
                                "STABLE TRANSCRIPT:"
                            );

                            console.log(
                                stableCaption
                            );


                            if (
                                stableCaption !==
                                lastAnalyzedCaption
                            ) {

                                lastAnalyzedCaption =
                                    stableCaption;


                                analyzeRequirement(
                                    stableCaption
                                );
                            }
                        }
                    }

                },
                2000
            );
    }
}


// ============================================================
// START CAPTION MONITOR
// ============================================================

setInterval(
    checkCaption,
    500
);