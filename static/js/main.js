// static/js/main.js

document.addEventListener('DOMContentLoaded', () => {

    // --- UTILITY FUNCTIONS ---
    
    /**
     * Generic function to call our Flask API.
     * @param {string} endpoint - The API endpoint to call (e.g., '/calculate/pcr').
     * @param {object} body - The JSON body for the POST request.
     * @returns {Promise<object>} - The JSON response from the server.
     */
    async function apiCall(endpoint, body) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An unknown error occurred.');
            }
            return response.json();
        } catch (error) {
            console.error('API Call Failed:', error);
            throw error;
        }
    }

    /**
     * Displays results in a standardized format.
     * @param {HTMLElement} wrapper - The container element for the result.
     * @param {string} resultHTML - The HTML content for the main result.
     * @param {string} explanation - The explanation text.
     */
    function displayResult(wrapper, resultHTML, explanation) {
        wrapper.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-semibold text-lg text-slate-800">Result:</p>
                    <div id="result-text" class="text-xl font-bold text-green-700">${resultHTML}</div>
                </div>
                <button class="copy-btn bg-slate-200 text-slate-800 text-sm font-bold py-1 px-3 rounded-md hover:bg-slate-300">Copy</button>
            </div>
            <p class="explanation-box">${explanation}</p>
        `;
        wrapper.style.display = 'block';

        const copyBtn = wrapper.querySelector('.copy-btn');
        const resultText = wrapper.querySelector('#result-text').innerText;
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(resultText).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            });
        });
    }

    /**
     * Displays an error message in the result wrapper.
     * @param {HTMLElement} wrapper - The container element for the error.
     * @param {string} message - The error message to display.
     */
    function displayError(wrapper, message) {
        wrapper.innerHTML = `
            <p class="font-semibold text-lg text-red-700">Error:</p>
            <p class="text-md text-red-600">${message}</p>
        `;
        wrapper.style.display = 'block';
    }


    // --- DARK MODE LOGIC ---


    // --- PCR MASTER MIX CALCULATOR ---
    const pcrForm = document.getElementById('pcr-form');
    const pcrComponentsContainer = document.getElementById('pcr-components');
    const addPcrComponentBtn = document.getElementById('add-pcr-component');
    const pcrResultWrapper = document.getElementById('pcr-result-wrapper');

    let componentId = 0;
    const createPcrComponentRow = (name = '', stock = '', final = '') => {
        componentId++;
        const div = document.createElement('div');
        div.className = 'grid grid-cols-1 sm:grid-cols-4 gap-2 items-end pcr-component-row';
        div.innerHTML = `
            <div class="sm:col-span-2">
                <label class="text-xs font-medium">Component Name</label>
                <input type="text" placeholder="e.g., Primer F" value="${name}" class="mt-1 block w-full rounded-md border-slate-300 bg-slate-50 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 pcr-comp-name">
            </div>
            <div>
                <label class="text-xs font-medium">Stock (X)</label>
                <input type="number" step="any" placeholder="10" value="${stock}" class="mt-1 block w-full rounded-md border-slate-300 bg-slate-50 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 pcr-comp-stock">
            </div>
            <div>
                <label class="text-xs font-medium">Final (X)</label>
                <input type="number" step="any" placeholder="0.5" value="${final}" class="mt-1 block w-full rounded-md border-slate-300 bg-slate-50 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 pcr-comp-final">
            </div>
            <button type="button" class="remove-pcr-component-btn bg-red-500 text-white rounded h-10 w-10 sm:w-auto ml-auto flex items-center justify-center font-bold text-lg">-</button>
        `;
        pcrComponentsContainer.appendChild(div);
        div.querySelector('.remove-pcr-component-btn').addEventListener('click', () => div.remove());
    };
    
    createPcrComponentRow('Polymerase', '5', '0.02');
    createPcrComponentRow('Buffer', '10', '1');
    createPcrComponentRow('dNTPs', '10', '0.2');
    createPcrComponentRow('Primer F', '10', '0.5');
    createPcrComponentRow('Primer R', '10', '0.5');
    createPcrComponentRow('Template DNA', '50', '2');

    addPcrComponentBtn.addEventListener('click', () => createPcrComponentRow());

    pcrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const components = [];
        document.querySelectorAll('.pcr-component-row').forEach(row => {
            const name = row.querySelector('.pcr-comp-name').value;
            const stock = row.querySelector('.pcr-comp-stock').value;
            const final = row.querySelector('.pcr-comp-final').value;
            if (name && stock && final) {
                components.push({ name, stock, final });
            }
        });

        const body = {
            reactions: document.getElementById('pcr-reactions').value,
            volume: document.getElementById('pcr-volume').value,
            components,
        };

        try {
            const data = await apiCall('/calculate/pcr', body);
            if (data.success) {
                let tableHTML = `
                    <p>Total Master Mix Volume: <strong class="text-lg">${data.total_mm_volume} µL</strong></p>
                    <table class="w-full mt-2 text-sm text-left">
                        <thead class="bg-slate-100">
                            <tr>
                                <th class="p-2">Component</th>
                                <th class="p-2 text-right">Per Rxn (µL)</th>
                                <th class="p-2 text-right">Master Mix (µL)</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                data.results.forEach(res => {
                    tableHTML += `
                        <tr class="border-b border-slate-200">
                            <td class="p-2 font-medium">${res.name}</td>
                            <td class="p-2 text-right">${res.single_rxn_vol}</td>
                            <td class="p-2 text-right font-bold">${res.master_mix_vol}</td>
                        </tr>
                    `;
                });
                tableHTML += '</tbody></table>';
                displayResult(pcrResultWrapper, tableHTML, data.explanation);
            } else {
                displayError(pcrResultWrapper, data.error);
            }
        } catch (error) {
            displayError(pcrResultWrapper, error.message);
        }
    });


    // --- BUFFER DILUTION CALCULATOR ---
    const dilutionForm = document.getElementById('dilution-form');
    const dilutionResultWrapper = document.getElementById('dilution-result-wrapper');

    dilutionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            c1: document.getElementById('dilution-c1').value,
            c2: document.getElementById('dilution-c2').value,
            v2: document.getElementById('dilution-v2').value,
            v1_unit: 'µL'
        };

        try {
            const data = await apiCall('/calculate/dilution', body);
            if (data.success) {
                displayResult(dilutionResultWrapper, data.result, data.explanation);
            } else {
                displayError(dilutionResultWrapper, data.error);
            }
        } catch (error) {
            displayError(dilutionResultWrapper, error.message);
        }
    });

    // --- DNA CONCENTRATION CONVERTER ---
    const dnaConcForm = document.getElementById('dna-conc-form');
    const dnaConcResultWrapper = document.getElementById('dna-conc-result-wrapper');
    
    dnaConcForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            concentration: document.getElementById('dna-conc').value,
            length: document.getElementById('dna-length').value,
        };

        try {
            const data = await apiCall('/convert/dna_concentration', body);
            if(data.success) {
                displayResult(dnaConcResultWrapper, data.result, data.explanation);
            } else {
                displayError(dnaConcResultWrapper, data.error);
            }
        } catch (error) {
            displayError(dnaConcResultWrapper, error.message);
        }
    });
    
    // --- µL TO MMOL CONVERTER ---
    const ulToMmolForm = document.getElementById('ul-to-mmol-form');
    const ulToMmolResultWrapper = document.getElementById('ul-to-mmol-result-wrapper');

    ulToMmolForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            volume: document.getElementById('ul-volume').value,
            molarity: document.getElementById('ul-molarity').value,
        };
        
        try {
            const data = await apiCall('/convert/ul_to_mmol', body);
            if(data.success) {
                displayResult(ulToMmolResultWrapper, data.result, data.explanation);
            } else {
                displayError(ulToMmolResultWrapper, data.error);
            }
        } catch (error) {
            displayError(ulToMmolResultWrapper, error.message);
        }
    });
});