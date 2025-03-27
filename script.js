let taxPercentage = 0; // Tax percentage from Google Sheets
let penaltyRates = {}; // Store Amnesty penalties by year
const sheetId = "14wzuddk7tA0EbENU_u369X9oMDSTC78xCpmMz2JUnfU";  
const apiKey = "AIzaSyCmWwe9Mtl5Km_gIir7j4FYY5d3xRBPkms"; // Replace with your secure API key

// Fetch tax percentage from Google Sheets
async function fetchTaxPercentage() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Penalties!A2?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        taxPercentage = data.values?.[0]?.[0] ? parseFloat(data.values[0][0]) : 0;
    } catch (error) {
        taxPercentage = 0;
    }
}

// Fetch penalty percentages from Amnesty sheet
async function fetchPenaltyRates() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Amnesty!A:B?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.values) {
            data.values.forEach(row => {
                let year = parseInt(row[0]);
                let penalty = parseFloat(row[1]) || 0;
                if (!isNaN(year)) {
                    penaltyRates[year] = penalty;
                }
            });
        }
    } catch (error) {
        console.error("❌ Error fetching penalty rates:", error);
    }
}

// Auto-fill current month
document.getElementById("month").value = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

// Update all rows after data change
function updateAllRows() {
    let totalFullPayment = 0;
    let totalPenalties = 0;
    let totalBilled = 0;

    document.querySelectorAll(".billing-table tr").forEach((row, index) => {
        if (index > 0) {
            calculateRow(row);

            let fullPayment = parseFloat(row.cells[3]?.querySelector("input").value) || 0;
            let penaltyAmount = parseFloat(row.cells[4]?.querySelector("input").value) || 0;
            let totalAmount = parseFloat(row.cells[5]?.querySelector("input").value) || 0;

            totalFullPayment += fullPayment;
            totalPenalties += penaltyAmount;
            totalBilled += totalAmount;
        }
    });

    document.getElementById("totalFullPayment").value = totalFullPayment.toFixed(2);
    document.getElementById("totalPenalties").value = totalPenalties.toFixed(2);
    document.getElementById("totalBilled").value = totalBilled.toFixed(2);
}

// Insert a new row dynamically
function insertRow() {
    let table = document.querySelector(".billing-table");
    let newRow = table.insertRow(-1);

    for (let i = 0; i < 6; i++) {
        let cell = newRow.insertCell(i);
        let input = document.createElement("input");
        input.type = "number";

        if (i === 0) { // "From Year" input
            input.placeholder = "YYYY";
            input.min = "1940";
            input.max = "2024";
            input.addEventListener("input", updateAllRows);
        } else if (i === 1) { // "To Year" input (DISABLED)
            input.placeholder = "YYYY";
            input.disabled = true; // Disable new To Year inputs
        } else {
            input.disabled = true; // Other fields auto-calculated
        }

        cell.appendChild(input);
    }

    let actionCell = newRow.insertCell(6);
    actionCell.innerHTML = `<button class='remove-bill-btn' onclick='removeRow(this)'>Remove</button> 
                            <button class='add-bill-btn' onclick='insertRow()'>Insert</button>`;
}

// Remove row
function removeRow(button) {
    let row = button.parentNode.parentNode;
    row.parentNode.removeChild(row);
    updateAllRows();
}

// Update the visibility of the Penalty % column
function updatePenaltyColumn() {
    let table = document.querySelector(".billing-table");
    let showPenalty = false;

    document.querySelectorAll(".billing-table tr").forEach((row, index) => {
        if (index > 0) {
            let fromYearInput = row.cells[0]?.querySelector("input");
            if (fromYearInput && fromYearInput.value.trim() !== "") {
                showPenalty = true;
            }
        }
    });

    let penaltyColumn = document.querySelectorAll(".billing-table th:nth-child(5), .billing-table td:nth-child(5)");
    penaltyColumn.forEach(cell => {
        cell.style.display = showPenalty ? "table-cell" : "none";
    });
}

// ✅ Corrected Calculation for Full Payment, Penalty, and Total
function calculateRow(row) {
    let assessedValue = parseFloat(document.getElementById("assessedValue").value) || 0;

    let fromYearInput = row.cells[0]?.querySelector("input");
    let toYearInput = row.cells[1]?.querySelector("input");
    let taxDueInput = row.cells[2]?.querySelector("input");
    let fullPaymentInput = row.cells[3]?.querySelector("input");
    let penaltyInput = row.cells[4]?.querySelector("input");
    let totalInput = row.cells[5]?.querySelector("input");

    if (!fromYearInput || !toYearInput || !taxDueInput || !fullPaymentInput || !penaltyInput || !totalInput) return;

    let fromYear = fromYearInput.value.trim();
    
    // Check if From Year is a valid 4-digit year (between 1900 and current year)
    let currentYear = new Date().getFullYear();
    let isValidYear = /^\d{4}$/.test(fromYear) && fromYear >= 1900 && fromYear <= currentYear;

    if (!isValidYear) {
        // Clear all calculated fields if From Year is invalid
        taxDueInput.value = "";
        fullPaymentInput.value = "";
        penaltyInput.value = "";
        totalInput.value = "";
        return;
    }

    let fromYearNum = parseInt(fromYear);
    let toYearNum = parseInt(toYearInput.value) || fromYearNum;
    let years = Math.max(1, toYearNum - fromYearNum + 1);

    // ✅ Tax Due Calculation
    let taxDue = (assessedValue * (taxPercentage / 100)).toFixed(2);
    taxDueInput.value = taxDue;

    // ✅ Full Payment Calculation
    let fullPayment = (parseFloat(taxDue) * 2 * years).toFixed(2);
    fullPaymentInput.value = fullPayment;

    // ✅ Penalty Calculation
    let penaltyPercent = penaltyRates[fromYearNum] || 0;
    let penaltyAmount = ((penaltyPercent / 100) * parseFloat(fullPayment)).toFixed(2);
    penaltyInput.value = penaltyAmount;

    // ✅ Total Calculation
    let total = (parseFloat(fullPayment) + parseFloat(penaltyAmount)).toFixed(2);
    totalInput.value = total;

    updatePenaltyColumn();
}


// Apply to all rows on input change
document.addEventListener("input", function (event) {
    let input = event.target;
    
    // If input belongs to the billing table
    if (input.closest(".billing-table tr input")) {
        let row = input.closest("tr");
        calculateRow(row);
    }

    // If input is from the "From Year" column, update all rows
    if (input.closest(".billing-table tr td:first-child input")) {
        updateAllRows();
    }
});


// ✅ Run on page load
window.onload = async function() {
    await fetchTaxPercentage();
    await fetchPenaltyRates();
    
    document.querySelectorAll(".billing-table tr").forEach(row => calculateRow(row));
    updatePenaltyColumn(); // Ensure initial visibility update
};

// Get billing container and buttons
const billContainer = document.querySelector(".bill-container");
const billList = document.querySelector(".bill-list"); 
const closeBillBtn = document.querySelector(".hide-bill-btn");
const clearBillBtn = document.querySelector(".clear-bill-btn");

// Fix: Target the correct "Add Bill" button
const addBillBtn = document.getElementById("addBill");


// Attach event listener to the correct button
addBillBtn.addEventListener("click", showBillingContainer);

// Show billing container and add details + billing table data
function showBillingContainer() {
    let name = document.getElementById("name").value.trim() || "N/A";
    let td = document.getElementById("td").value.trim() || "N/A";
    let address = document.getElementById("address").value.trim() || "N/A";
    let assessedValue = document.getElementById("assessedValue").value.trim() || "0.00";
    let totalFullPayment = document.getElementById("totalFullPayment").value.trim() || "0.00";
    let totalPenalties = document.getElementById("totalPenalties").value.trim() || "0.00";
    let totalBilled = document.getElementById("totalBilled").value.trim() || "0.00";

    let billList = document.querySelector(".bill-list");
    let billEntry = document.createElement("div");
    billEntry.classList.add("bill-entry");

    let billingData = getBillingTableData();
    let billingTableHTML = `
        <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr>
                    <th>From Year</th>
                    <th>To Year</th>
                    <th>Tax Due</th>
                    <th>Full Payment</th>
                    <th>Penalty</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    billingData.forEach(data => {
        billingTableHTML += `
            <tr>
                <td>${data.fromYear}</td>
                <td>${data.toYear}</td>
                <td>₱${parseFloat(data.taxDue).toLocaleString()}</td>
                <td>₱${parseFloat(data.fullPayment).toLocaleString()}</td>
                <td>₱${parseFloat(data.penalty).toLocaleString()}</td>
                <td><strong>₱${parseFloat(data.total).toLocaleString()}</strong></td>
            </tr>
        `;
    });

    billingTableHTML += `</tbody></table>`;

    billEntry.innerHTML = `
        <strong>📄 Customer Bill</strong><br>
        <b>Name:</b> ${name}<br>
        <b>TD #:</b> ${td}<br>
        <b>Address:</b> ${address}<br>
        <b>Assessed Value:</b> ₱${parseFloat(assessedValue).toLocaleString()}<br><hr>
        <b>Total Full Payment:</b> ₱${parseFloat(totalFullPayment).toLocaleString()}<br>
        <b>Total Penalties:</b> ₱${parseFloat(totalPenalties).toLocaleString()}<br>
        <b>Total Billed:</b> <span style="color:green; font-weight:bold;">₱${parseFloat(totalBilled).toLocaleString()}</span>
        ${billingTableHTML}
        <button class="delete-bill-btn" onclick="deleteBill(this)">🗑 Remove</button>
    `;

    billList.appendChild(billEntry);
    document.querySelector(".bill-container").classList.add("show");
}

// Extract billing table data
function getBillingTableData() {
    let rows = document.querySelectorAll(".billing-table tr");
    let billingData = [];

    rows.forEach((row, index) => {
        if (index > 0) { // Skip header row
            let fromYear = row.cells[0]?.querySelector("input").value || "N/A";
            let toYear = row.cells[1]?.querySelector("input").value || "N/A";
            let taxDue = row.cells[2]?.querySelector("input").value || "0.00";
            let fullPayment = row.cells[3]?.querySelector("input").value || "0.00";
            let penalty = row.cells[4]?.querySelector("input").value || "0.00";
            let total = row.cells[5]?.querySelector("input").value || "0.00";

            billingData.push({ fromYear, toYear, taxDue, fullPayment, penalty, total });
        }
    });

    return billingData;
}


// Hide the bill container when "Close" button is clicked
function hideBillingContainer() {
    document.querySelector(".bill-container").classList.remove("show");
}

// Remove all billing details when "Clear All" button is clicked
function clearAllBills() {
    document.querySelector(".bill-list").innerHTML = ""; // Remove all bills
}

// Delete a single bill entry
function deleteBill(button) {
    button.parentNode.remove();
}

// Print the content of the bill container (excluding buttons)
function printBillContainer() {
    let billContainer = document.querySelector(".bill-container").cloneNode(true);
    let buttons = billContainer.querySelectorAll(".bill-buttons, .delete-bill-btn");
    buttons.forEach(button => button.remove());

    let printWindow = window.open("", "", "width=800,height=600");
    printWindow.document.write(`
        <html>
        <head>
            <title>Print Bill</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .bill-container { width: 100%; max-width: 8.5in; margin: auto; }
                .bill-entry { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; padding: 10px; }
                h3 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid black; padding: 5px; text-align: center; }
            </style>
        </head>
        <body>
            <h3>🧾 Billing Details</h3>
            <div class="bill-container">
                ${billContainer.innerHTML}
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}


