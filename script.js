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

// Function to validate To Year input for the first row
function validateToYear(input) {
    let value = parseInt(input.value) || 0;
    if (value > 2021) {
        showAlert("To Year cannot be greater than 2021 for the first row", "error");
        input.value = "2021";
        updateAllRows();
    }
}

// Insert a new row dynamically
function insertRow() {
    let table = document.querySelector(".billing-table");
    let newRow = table.insertRow(-1);
    let isFirstRow = table.rows.length === 2; // Check if this is the first data row

    for (let i = 0; i < 6; i++) {
        let cell = newRow.insertCell(i);
        let input = document.createElement("input");
        input.type = "number";

        if (i === 0) { // "From Year" input
            input.placeholder = "YYYY";
            input.min = "1940";
            input.max = "2024";
            input.addEventListener("input", function() {
                updateAllRows();
                // Update To Year based on From Year for first row
                if (isFirstRow) {
                    let toYearInput = this.parentNode.nextElementSibling.querySelector("input");
                    if (!toYearInput.value) {
                        toYearInput.value = this.value;
                    }
                }
            });
        } else if (i === 1) { // "To Year" input
            input.placeholder = "YYYY";
            input.min = "1940";
            input.max = "2024";
            if (isFirstRow) {
                input.addEventListener("input", function() {
                    validateToYear(this);
                });
            } else {
                input.disabled = true;
            }
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

    let fromYear = parseInt(fromYearInput.value) || new Date().getFullYear();
    let toYear = parseInt(toYearInput.value) || fromYear;
    let years = Math.max(1, toYear - fromYear + 1);

    // ✅ Tax Due Calculation
    let taxDue = (assessedValue * (taxPercentage / 100)).toFixed(2);
    taxDueInput.value = taxDue;

    // ✅ Full Payment Calculation
    let fullPayment = (parseFloat(taxDue) * 2 * years).toFixed(2);
    fullPaymentInput.value = fullPayment;

    // ✅ Corrected Penalty Calculation
    let penaltyPercent = penaltyRates[fromYear] || 0;
    let penaltyAmount = ((penaltyPercent / 100) * parseFloat(fullPayment)).toFixed(2);
    penaltyInput.value = penaltyAmount;

    // ✅ Total Calculation (Full Payment + Penalty)
    let total = (parseFloat(fullPayment) + parseFloat(penaltyAmount)).toFixed(2);
    totalInput.value = total;

    // Update penalty column visibility
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

// Show billing container and add customer details to bill-list
function showBillingContainer() {
    // Validate required fields
    const name = document.getElementById("name").value.trim();
    const td = document.getElementById("td").value.trim();
    const address = document.getElementById("address").value.trim();
    const assessedValue = document.getElementById("assessedValue").value.trim();
    const parcels = document.getElementById("parcels").value.trim();
    
    // Check if any required field is empty
    if (!name || !td || !address || !assessedValue) {
        showAlert("Please fill in all required fields: Name, TD Number, Address, and Assessed Value.");
        return;
    }
    
    let totalFullPayment = document.getElementById("totalFullPayment").value.trim() || "0.00";
    let totalPenalties = document.getElementById("totalPenalties").value.trim() || "0.00";
    let totalBilled = document.getElementById("totalBilled").value.trim() || "0.00";

    // Get the bill list container
    let billList = document.querySelector(".bill-list");
    
    // Create a new bill entry
    let billEntry = document.createElement("div");
    billEntry.classList.add("bill-entry");

    // Get the billing table rows
    let rows = document.querySelectorAll(".billing-table tr");
    let tableHTML = `
        <table class="simple-billing-table">
            <thead>
                <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Tax Due</th>
                    <th>Full Payment</th>
                    <th>Penalty %</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Add each row's data to the table
    rows.forEach((row, index) => {
        if (index > 0) { // Skip header row
            let cells = row.cells;
            let fromYear = cells[0].querySelector("input").value || "";
            let toYear = cells[1].querySelector("input").value || "";
            let taxDue = cells[2].querySelector("input").value || "0.00";
            let fullPayment = cells[3].querySelector("input").value || "0.00";
            let penalty = cells[4].querySelector("input").value || "0.00";
            let total = cells[5].querySelector("input").value || "0.00";

            if (fromYear) { // Only add row if there's a from year
                tableHTML += `
                    <tr>
                        <td>${fromYear}</td>
                        <td>${toYear}</td>
                        <td>₱${parseFloat(taxDue).toLocaleString()}</td>
                        <td>₱${parseFloat(fullPayment).toLocaleString()}</td>
                        <td>${penalty}</td>
                        <td>₱${parseFloat(total).toLocaleString()}</td>
                    </tr>
                `;
            }
        }
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    // Create customer details HTML with conditional parcels display
    let customerDetailsHTML = `
        <div class="detail-row"><b>Name:</b> ${name}</div>
        <div class="detail-row"><b>TD #:</b> ${td}</div>
        <div class="detail-row"><b>Address:</b> ${address}</div>
        <div class="detail-row"><b>Assessed Value:</b> ₱${parseFloat(assessedValue).toLocaleString()}</div>
    `;
    
    // Add parcels information if it has a value
    if (parcels) {
        customerDetailsHTML += `<div class="detail-row"><b>No. of Parcels:</b> ${parcels}</div>`;
    }

    // Bill content with two-column layout and simple table
    billEntry.innerHTML = `
        <div class="bill-columns">
            <div class="bill-column customer-details">
                ${customerDetailsHTML}
            </div>
            <div class="bill-column payment-details">
                <div class="detail-row"><b>Total Full Payment:</b> ₱${parseFloat(totalFullPayment).toLocaleString()}</div>
                <div class="detail-row"><b>Total Penalties:</b> ₱${parseFloat(totalPenalties).toLocaleString()}</div>
                <div class="detail-row total"><b>Total Billed:</b> <span style="color:green; font-weight:bold;">₱${parseFloat(totalBilled).toLocaleString()}</span></div>
            </div>
        </div>
        <div class="bill-table-container">
            ${tableHTML}
        </div>
        <button class="delete-bill-btn" onclick="deleteBill(this)">Remove</button>
    `;

    // Add the bill entry to the bill container
    billList.appendChild(billEntry);

    // Show the bill container
    document.querySelector(".bill-container").classList.add("show");
    
    // Update the summary section
    updateBillSummary();
    
    // Show success alert
    showAlert("Bill added successfully!", "success");
}

// Function to display professional alerts
function showAlert(message, type = "error") {
    // Remove any existing alerts
    const existingAlert = document.querySelector(".custom-alert");
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alertElement = document.createElement("div");
    alertElement.className = `custom-alert ${type}`;
    
    // Set icon based on alert type
    let icon = "";
    if (type === "success") {
        icon = '<i class="fas fa-check-circle"></i>';
    } else if (type === "warning") {
        icon = '<i class="fas fa-exclamation-triangle"></i>';
    } else {
        icon = '<i class="fas fa-exclamation-circle"></i>';
    }
    
    // Set alert content
    alertElement.innerHTML = `
        <div class="alert-content">
            ${icon}
            <span>${message}</span>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add alert to the document
    document.body.appendChild(alertElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, 5000);
}

// Hide the bill container when "Close" button is clicked
function hideBillingContainer() {
    document.querySelector(".bill-container").classList.remove("show");
}

// Remove all billing details when "Clear All" button is clicked
function clearAllBills() {
    document.querySelector(".bill-list").innerHTML = ""; // Remove all bills
    updateBillSummary(); // Update summary after clearing
}

// Delete a single bill entry
function deleteBill(button) {
    button.parentNode.remove();
    updateBillSummary(); // Update summary after deleting
}

// Calculate and display the summary of all bills
function updateBillSummary() {
    // Get all bill entries
    const billEntries = document.querySelectorAll(".bill-entry");
    
    // Initialize totals
    let grandTotalFullPayment = 0;
    let grandTotalPenalties = 0;
    let grandTotalBilled = 0;
    
    // Calculate totals from all bill entries
    billEntries.forEach(entry => {
        const totalFullPayment = parseFloat(entry.querySelector(".payment-details .detail-row:nth-child(1)").textContent.split("₱")[1].replace(/,/g, "")) || 0;
        const totalPenalties = parseFloat(entry.querySelector(".payment-details .detail-row:nth-child(2)").textContent.split("₱")[1].replace(/,/g, "")) || 0;
        const totalBilled = parseFloat(entry.querySelector(".payment-details .detail-row.total span").textContent.split("₱")[1].replace(/,/g, "")) || 0;
        
        grandTotalFullPayment += totalFullPayment;
        grandTotalPenalties += totalPenalties;
        grandTotalBilled += totalBilled;
    });
    
    // Check if summary section exists, if not create it
    let summarySection = document.querySelector(".bill-summary-section");
    if (!summarySection) {
        summarySection = document.createElement("div");
        summarySection.classList.add("bill-summary-section");
        document.querySelector(".bill-container").appendChild(summarySection);
    }
    
    // Update the summary section content
    summarySection.innerHTML = `
        <h3>Summary of All Bills</h3>
        <div class="bill-summary-container">
            <div class="bill-summary-item">
                <label>Total Full Payment:</label>
                <span>₱${grandTotalFullPayment.toLocaleString()}</span>
            </div>
            <div class="bill-summary-item">
                <label>Total Penalties:</label>
                <span>₱${grandTotalPenalties.toLocaleString()}</span>
            </div>
            <div class="bill-summary-item total">
                <label>Total Billed:</label>
                <span>₱${grandTotalBilled.toLocaleString()}</span>
            </div>
        </div>
    `;
}

// Print the content of the bill container (excluding buttons)
function printBillContainer() {
    // Clone the bill container
    let billContainer = document.querySelector(".bill-container").cloneNode(true);
    
    // Remove action buttons from the cloned container
    let buttons = billContainer.querySelectorAll(".hide-bill-btn, .clear-bill-btn, .print-bill-btn, .delete-bill-btn");
    buttons.forEach(button => button.remove());

    // Create a new window for printing
    let printWindow = window.open("", "", "width=800,height=600");
    
    // Write the HTML content with all necessary styles
    printWindow.document.write(`
        <html>
        <head>
            <title>Real Property Tax Bill</title>
            <style>
                @page {
                    size: letter;
                    margin: 0.2in;
                }
                body { 
                    font-family: 'Arial', sans-serif; 
                    margin: 0;
                    padding: 0;
                    background: white;
                    color: #333;
                }
                .print-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #004d80;
                }
                .print-header h1 {
                    color: #004d80;
                    margin: 0 0 5px 0;
                    font-size: 24px;
                }
                .print-header p {
                    margin: 0;
                    font-size: 14px;
                    color: #555;
                }
                .bill-container { 
                    width: 100%; 
                    max-width: 8.5in; 
                    margin: auto; 
                    background: white;
                    padding: 0;
                }
                .bill-entry { 
                    border: 1px solid #ddd; 
                    padding: 15px; 
                    margin-bottom: 20px; 
                    background: #fff; 
                    border-radius: 5px;
                    position: relative;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    page-break-inside: avoid;
                }
                .bill-columns {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 15px;
                }
                .bill-column {
                    flex: 1;
                    min-width: 0;
                }
                .bill-column.customer-details {
                    border-right: 1px solid #ddd;
                    padding-right: 20px;
                }
                .bill-column.payment-details {
                    padding-left: 20px;
                }
                .detail-row {
                    margin: 8px 0;
                    font-size: 13px;
                    line-height: 1.4;
                }
                .detail-row b {
                    color: #004d80;
                }
                .detail-row.total {
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px dashed #ccc;
                    font-size: 14px;
                }
                .bill-table-container {
                    margin-top: 15px;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                    overflow-x: auto;
                }
                .simple-billing-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .simple-billing-table th {
                    background: #004d80;
                    color: white;
                    padding: 8px;
                    text-align: center;
                    font-weight: bold;
                    white-space: nowrap;
                }
                .simple-billing-table td {
                    padding: 6px;
                    text-align: center;
                    border: 1px solid #ddd;
                }
                .simple-billing-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                h3 { 
                    text-align: center; 
                    color: #004d80;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                .bill-summary-section {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 2px solid #004d80;
                }
                .bill-summary-container {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px;
                }
                .bill-summary-item {
                    flex: 1;
                    text-align: center;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 5px;
                    margin: 0 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .bill-summary-item.total {
                    background: #004d80;
                    color: white;
                }
                .bill-summary-item label {
                    display: block;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .bill-summary-item span {
                    font-size: 16px;
                    font-weight: bold;
                }
                .print-footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }
                .print-date {
                    text-align: right;
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 10px;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .bill-container {
                        box-shadow: none;
                    }
                    .bill-entry {
                        page-break-inside: avoid;
                    }
                    .print-header {
                        position: running(header);
                    }
                    .print-footer {
                        position: running(footer);
                    }
                    @page {
                        @top-center {
                            content: element(header);
                        }
                        @bottom-center {
                            content: element(footer);
                        }
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>REAL PROPERTY TAX BILL</h1>
                <p>Official Tax Assessment and Billing Document</p>
            </div>
            <div class="print-date">
                Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
            </div>
            <div class="bill-container">
                ${billContainer.innerHTML}
            </div>
            <div class="print-footer">
                <p>This is an official tax document. For questions or concerns, please contact the Municipal Treasurer's Office.</p>
                <p>© ${new Date().getFullYear()} Municipal Treasurer's Office. All rights reserved.</p>
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

// Function to recalculate values based on number of parcels
function recalculateValues() {
    const assessedValue = parseFloat(document.getElementById("assessedValue").value) || 0;
    
    // Get all rows in the billing table
    const rows = document.querySelectorAll(".billing-table tr");
    
    // Skip the header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.cells;
        
        // Get the from year input
        const fromYearInput = cells[0].querySelector("input");
        const fromYear = fromYearInput.value;
        
        // Only recalculate if there's a from year
        if (fromYear) {
            // Calculate tax due based on assessed value
            const taxDue = assessedValue * 0.01;
            
            // Update tax due cell
            const taxDueInput = cells[2].querySelector("input");
            taxDueInput.value = taxDue.toFixed(2);
            
            // Calculate full payment (same as tax due)
            const fullPaymentInput = cells[3].querySelector("input");
            fullPaymentInput.value = taxDue.toFixed(2);
            
            // Get penalty percentage
            const penaltyPercentInput = cells[4].querySelector("input");
            const penaltyPercent = parseFloat(penaltyPercentInput.value) || 0;
            
            // Calculate total with penalty
            const penalty = taxDue * (penaltyPercent / 100);
            const total = taxDue + penalty;
            
            // Update total cell
            const totalInput = cells[5].querySelector("input");
            totalInput.value = total.toFixed(2);
        }
    }
    
    // Update summary values
    updateSummaryValues();
}

// Function to update summary values
function updateSummaryValues() {
    let totalFullPayment = 0;
    let totalPenalties = 0;
    let totalBilled = 0;
    
    // Get all rows in the billing table
    const rows = document.querySelectorAll(".billing-table tr");
    
    // Skip the header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.cells;
        
        // Get the from year input
        const fromYearInput = cells[0].querySelector("input");
        const fromYear = fromYearInput.value;
        
        // Only include if there's a from year
        if (fromYear) {
            // Get full payment
            const fullPaymentInput = cells[3].querySelector("input");
            const fullPayment = parseFloat(fullPaymentInput.value) || 0;
            
            // Get total
            const totalInput = cells[5].querySelector("input");
            const total = parseFloat(totalInput.value) || 0;
            
            // Calculate penalty
            const penalty = total - fullPayment;
            
            // Add to totals
            totalFullPayment += fullPayment;
            totalPenalties += penalty;
            totalBilled += total;
        }
    }
    
    // Update summary inputs
    document.getElementById("totalFullPayment").value = totalFullPayment.toFixed(2);
    document.getElementById("totalPenalties").value = totalPenalties.toFixed(2);
    document.getElementById("totalBilled").value = totalBilled.toFixed(2);
}

// Update the existing calculateTaxDue function to use the new recalculateValues function
function calculateTaxDue() {
    recalculateValues();
}

// Update the existing calculateFullPayment function to use the new recalculateValues function
function calculateFullPayment() {
    recalculateValues();
}

// Update the existing calculateTotal function to use the new recalculateValues function
function calculateTotal() {
    recalculateValues();
}


