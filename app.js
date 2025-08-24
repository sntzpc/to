        function openTab(evt, tabName) {
            var tabcontent = document.getElementsByClassName("tabcontent");
            for (var i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }

            var tablinks = document.getElementsByClassName("tablinks");
            for (var i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }

            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
        }

        // Variabel Global
        let allData = {};
        let currentKey = "";
        let currentPokok = null;
        let lastActivity = {
            saved: null,
            verified: null,
            reported: null
        };
        let reportData = [];

        // Fungsi mengedit data pokok
        function editPokokData(key, noPokok) {
            const pokokIndex = allData[key].findIndex(item => item.no_pokok == noPokok);
            if (pokokIndex === -1) {
                alert("Data pokok tidak ditemukan!");
                return;
            }

            const pokokData = allData[key][pokokIndex];

            document.getElementById("identifikasi").style.display = "block";
            document.getElementById("verifikasi").style.display = "none";
            document.getElementById("report").style.display = "none";

            const tablinks = document.getElementsByClassName("tablinks");
            for (let i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            document.querySelector('.tab button:nth-child(1)').className += " active";

            const [estate, divisi, blok] = key.split("_");
            document.getElementById("estate").value = estate;
            document.getElementById("divisi").value = divisi;
            document.getElementById("blok").value = blok;
            document.getElementById("no_pokok").value = pokokData.no_pokok;
            document.getElementById("keteranganPokok").value = pokokData.keterangan || "";

            // menandai pokok yang ≤6.4m
            for (let i = 1; i <= 6; i++) {
                const input = document.querySelector(`#measurementTable tr:nth-child(${i+1}) .jarak`);
                input.value = pokokData[`p${i}`] || "";
                checkDistance(input);
            }
            currentKey = key;
            window.scrollTo(0, 0);
        }

        // Fungsi menghapus data pokok
        function deletePokokData(key, noPokok) {
            if (!confirm(`Apakah Anda yakin ingin menghapus data No. Pokok ${noPokok}?`)) {
                return;
            }

            const pokokIndex = allData[key].findIndex(item => item.no_pokok == noPokok);
            if (pokokIndex === -1) {
                alert("Data pokok tidak ditemukan!");
                return;
            }

            allData[key].splice(pokokIndex, 1);

            if (allData[key].length === 0) {
                delete allData[key];
            }

            saveToLocalStorage();
            updateReport();
            alert(`Data No. Pokok ${noPokok} telah dihapus!`);
        }

        function updateHighlightedTextColor() {
            const isDarkMode = document.body.classList.contains('dark-mode');
            const highlightedCells = document.querySelectorAll('.red-bg, .yellow-bg, .blue-bg');

            highlightedCells.forEach(cell => {
                if (isDarkMode) {
                    cell.style.color = 'black';
                } else {
                    cell.style.color = '';
                }
            });
        }

        // Inisiasi muat halaman
        window.onload = function () {
            document.getElementsByClassName("tablinks")[0].click();

            loadFromLocalStorage();
            updateReport();

            const elVerifierLevel = document.getElementById('verifierLevel');
            elVerifierLevel.addEventListener('change', updateVerifikasiSummary);

            updateVerifikasiSummary();
            updateHighlightedTextColor();
        };

        // Check distance and mark if <= 6.4m and not 0
        function checkDistance(input) {
            const value = parseFloat(input.value);
            if (value > 0 && value <= 6.4) {
                input.parentElement.classList.add("red-bg");
            } else {
                input.parentElement.classList.remove("red-bg");
            }
        }

        // Simpan data identifikasi
        function saveData() {
            const estate = document.getElementById("estate").value.trim();
            const divisi = document.getElementById("divisi").value.trim();
            const blok = document.getElementById("blok").value.trim();
            const noPokok = document.getElementById("no_pokok").value.trim();

            if (!estate || !divisi || !blok || !noPokok) {
                alert("Harap isi semua field identifikasi!");
                return;
            }
            const key = `${estate}_${divisi}_${blok}`;
            currentKey = key;

            if (!allData[key]) {
                allData[key] = [];
            }

            // Cari pokok yang sudah ada
            const existingIndex = allData[key].findIndex(item => item.no_pokok == noPokok);
            if (existingIndex >= 0) {
                if (!confirm(`No. Pokok ${noPokok} sudah ada. Update data?`)) return;
            }

            const jarakInputs = document.querySelectorAll("#measurementTable .jarak");
            const keterangan = document.getElementById("keteranganPokok").value;

            const measurements = {};
            for (let i = 0; i < jarakInputs.length; i++) {
                const point = `p${i+1}`;
                measurements[point] = jarakInputs[i].value ? parseFloat(jarakInputs[i].value) : "";
            }

            // Buat data pokok
            const now = new Date();
            const timestamp = now.toLocaleString();

            const pokokData = {
                no_pokok: noPokok,
                ...measurements,
                keterangan: keterangan,
                verifikasi: {
                    askep: {
                        keputusan: "",
                        keterangan: "",
                        timestamp: ""
                    },
                    mgr: {
                        keputusan: "",
                        keterangan: "",
                        timestamp: ""
                    },
                    rc: {
                        keputusan: "",
                        keterangan: "",
                        timestamp: ""
                    }
                },
                last_updated: timestamp
            };

            if (existingIndex >= 0) {
                allData[key][existingIndex] = pokokData;
            } else {
                allData[key].push(pokokData);
            }

            // Urutkan berdasarkan no_pokok
            allData[key].sort((a, b) => {

                const numA = parseInt(a.no_pokok.match(/\d+/)[0]);
                const numB = parseInt(b.no_pokok.match(/\d+/)[0]);

                if (numA !== numB) return numA - numB;
                return a.no_pokok.localeCompare(b.no_pokok);
            });

            lastActivity.saved = timestamp;
            document.getElementById("lastSaved").textContent = `Terakhir disimpan: ${timestamp}`;

            saveToLocalStorage();
            updateReport();
            resetForm(false);
            alert(`Data No. Pokok ${noPokok} berhasil disimpan!`);
        }

        // Mereset Form
        function resetForm(clearLocation) {
            if (clearLocation) {
                document.getElementById("estate").value = "";
                document.getElementById("divisi").value = "";
                document.getElementById("blok").value = "";
                currentKey = "";
            }

            document.getElementById("no_pokok").value = "";
            document.getElementById("keteranganPokok").value = "";

            const jarakInputs = document.querySelectorAll("#measurementTable .jarak");

            for (let i = 0; i < jarakInputs.length; i++) {
                jarakInputs[i].value = "";
                jarakInputs[i].parentElement.classList.remove("red-bg");
            }
        }

        // Reset blok ini
        function resetCurrentBlock() {
            const estate = document.getElementById("estate").value.trim();
            const divisi = document.getElementById("divisi").value.trim();
            const blok = document.getElementById("blok").value.trim();

            if (!estate || !divisi || !blok) {
                alert("Harap isi Estate, Divisi, dan Blok terlebih dahulu!");
                return;
            }

            const key = `${estate}_${divisi}_${blok}`;

            if (allData[key] && allData[key].length > 0) {
                if (confirm(`Apakah Anda yakin ingin menghapus SEMUA data untuk Blok ${blok}?`)) {
                    delete allData[key];
                    saveToLocalStorage();
                    updateReport();
                    resetForm(false);
                    alert(`Data untuk Blok ${blok} telah dihapus!`);
                }
            } else {
                alert(`Tidak ada data untuk Blok ${blok}!`);
            }
        }

        // Load data dari  Excel
        function loadExcel() {
            const fileInput = document.getElementById("uploadExcel");
            const file = fileInput.files[0];

            if (!file) {
                alert("Pilih file Excel terlebih dahulu!");
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array'
                });

                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    alert("File Excel kosong atau format tidak sesuai!");
                    return;
                }

                jsonData.forEach(row => {
                    const estate = row.Estate || "";
                    const divisi = row.Divisi || "";
                    const blok = row.Blok || "";
                    const noPokok = row["No. Pokok"] || "";

                    if (estate && divisi && blok && noPokok) {
                        const key = `${estate}_${divisi}_${blok}`;
                        const now = new Date().toLocaleString();

                        if (!allData[key]) {
                            allData[key] = [];
                        }

                        const exists = allData[key].some(item => item.no_pokok == noPokok);
                        if (!exists) {
                            allData[key].push({
                                no_pokok: noPokok.toString(),
                                p1: row.P1 || "",
                                p2: row.P2 || "",
                                p3: row.P3 || "",
                                p4: row.P4 || "",
                                p5: row.P5 || "",
                                p6: row.P6 || "",
                                keterangan: row.Keterangan || "",
                                verifikasi: {
                                    askep: {
                                        keputusan: row.Askep || "",
                                        keterangan: row["Keterangan Askep"] || "",
                                        timestamp: now
                                    },
                                    mgr: {
                                        keputusan: row.MGR || "",
                                        keterangan: row["Keterangan MGR"] || "",
                                        timestamp: now
                                    },
                                    rc: {
                                        keputusan: row.RC || "",
                                        keterangan: row["Keterangan RC"] || "",
                                        timestamp: now
                                    }
                                },
                                last_updated: now
                            });
                        }
                    }
                });

                for (const key in allData) {
                    allData[key].sort((a, b) => {
                        // Extract numeric part for comparison
                        const numA = parseInt(a.no_pokok.match(/\d+/)[0]);
                        const numB = parseInt(b.no_pokok.match(/\d+/)[0]);

                        if (numA !== numB) return numA - numB;
                        return a.no_pokok.localeCompare(b.no_pokok);
                    });
                }

                saveToLocalStorage();
                updateReport();
                updateVerifikasiSummary();
                alert(`Data berhasil diimpor! Total blok: ${Object.keys(allData).length}`);
            };

            reader.readAsArrayBuffer(file);
        }

        // Cari pokok verifikasi
        function findPokok() {
            const noPokok = document.getElementById("searchPokok").value;
            if (!noPokok) {
                alert("Masukkan No. Pokok terlebih dahulu!");
                return;
            }

            let found = false;
            let pokokData = null;
            let foundKey = "";

            for (const key in allData) {
                const pokok = allData[key].find(item => item.no_pokok == noPokok);
                if (pokok) {
                    found = true;
                    pokokData = pokok;
                    foundKey = key;
                    break;
                }
            }

            if (!found) {
                alert(`No. Pokok ${noPokok} tidak ditemukan!`);
                document.getElementById("verificationData").style.display = "none";
                document.getElementById("askepResult").textContent = "";
                return;
            }

            const [estate, divisi, blok] = foundKey.split("_");

            const askepResult = pokokData.verifikasi.askep.keputusan ?
                `Hasil Verifikasi Askep: ${pokokData.verifikasi.askep.keputusan} - ${pokokData.verifikasi.askep.keterangan || '-'}` :
                "Belum ada verifikasi Askep";
            const mgrResult = pokokData.verifikasi.mgr.keputusan ?
                `Hasil Verifikasi MGR: ${pokokData.verifikasi.mgr.keputusan} - ${pokokData.verifikasi.mgr.keterangan || '-'}` :
                " ";
            const rcResult = pokokData.verifikasi.rc.keputusan ?
                `Hasil Verifikasi RC/VPA: ${pokokData.verifikasi.rc.keputusan} - ${pokokData.verifikasi.rc.keterangan || '-'}` :
                " ";
            document.getElementById("askepResult").innerHTML =
                `${askepResult}<br>${mgrResult}<br>${rcResult}`;

            const verificationTable = document.getElementById("verificationTable");

            while (verificationTable.rows.length > 1) {
                verificationTable.deleteRow(1);
            }

            let measurementCount = 0;
            let below6_4Count = 0;

            for (let i = 1; i <= 6; i++) {
                const row = verificationTable.insertRow();
                const cell1 = row.insertCell(0);
                const cell2 = row.insertCell(1);

                cell1.innerHTML = `P${i}`;
                const distance = pokokData[`p${i}`];
                cell2.innerHTML = distance === "" ? "" : distance;

                if (distance !== "" && parseFloat(distance) > 0 && parseFloat(distance) <= 6.4) {
                    row.classList.add("red-bg");
                    below6_4Count++;
                }

                if (distance !== "") {
                    measurementCount++;
                }
            }

            document.getElementById("measurementSummary").innerHTML =
                `<p>Pengukuran: ${measurementCount} dari 6 titik (${measurementCount < 6 ? "Ada titik tidak diukur" : "Semua titik terukur"})</p>
                 <p>Titik ≤ 6.4m: ${below6_4Count} (selain 0)</p>`;

            // Set keterangan
            document.getElementById("keteranganPokokVerifikasi").value = pokokData.keterangan || "";

            currentPokok = {
                key: foundKey,
                no_pokok: noPokok,
                estate: estate,
                divisi: divisi,
                blok: blok
            };

            document.getElementById("verificationData").style.display = "block";


        }

        // Simpan data verifikasi
        function saveVerification() {
            if (!currentPokok) {
                alert("Tidak ada data pokok yang dipilih!");
                return;
            }

            const level = document.getElementById("verifierLevel").value;
            const keputusan = document.getElementById("keputusan").value;
            const keterangan = document.getElementById("keteranganPokokVerifikasi").value;

            if (!keputusan) {
                alert("Pilih keputusan verifikasi terlebih dahulu!");
                return;
            }

            // Cari pokok
            const pokokIndex = allData[currentPokok.key].findIndex(
                item => item.no_pokok == currentPokok.no_pokok
            );

            if (pokokIndex >= 0) {
                const now = new Date().toLocaleString();

                allData[currentPokok.key][pokokIndex].verifikasi[level] = {
                    keputusan: keputusan,
                    keterangan: keterangan,
                    timestamp: now
                };

                // Update keterangan
                allData[currentPokok.key][pokokIndex].keterangan = keterangan;
                allData[currentPokok.key][pokokIndex].last_updated = now;

                lastActivity.verified = now;
                document.getElementById("lastVerified").textContent = `Terakhir diverifikasi: ${now}`;

                saveToLocalStorage();
                updateReport();
                updateVerifikasiSummary();
                alert(`Verifikasi ${level.toUpperCase()} untuk No. Pokok ${currentPokok.no_pokok} berhasil disimpan!`);
            } else {
                alert("Data pokok tidak ditemukan!");
            }
        }

        // Tambah pokok baru
        function addNewPokok() {
            if (!currentPokok) {
                alert("Tidak ada konteks blok untuk menambah pokok baru!");
                return;
            }

            // Pindah ke tab identifikasi
            document.getElementById("identifikasi").style.display = "block";
            document.getElementById("verifikasi").style.display = "none";

            const tablinks = document.getElementsByClassName("tablinks");
            for (let i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            document.querySelector('.tab button:nth-child(1)').className += " active";

            // ambil estate, divisi, blok
            document.getElementById("estate").value = currentPokok.estate;
            document.getElementById("divisi").value = currentPokok.divisi;
            document.getElementById("blok").value = currentPokok.blok;

            // Fokus ke no pokok
            document.getElementById("no_pokok").focus();

            // Tabah huruf 'B'
            const baseNumber = currentPokok.no_pokok.replace(/[^0-9]/g, '');
            const suffix = currentPokok.no_pokok.replace(/[0-9]/g, '') || '';
            const newSuffix = suffix ? String.fromCharCode(suffix.charCodeAt(0) + 1) : 'B';
            document.getElementById("no_pokok").value = baseNumber + newSuffix;
        }

        function countTotalVerifiedBPokok(level) {
            let total = 0;
            for (const key in allData) {
                allData[key].forEach(pokok => {
                    if (pokok.no_pokok.includes('B') && pokok.verifikasi[level].keputusan) {
                        total++;
                    }
                });
            }
            return total;
        }

        function generateReport() {
            const now = new Date().toLocaleString();
            lastActivity.reported = now;
            document.getElementById("reportTimestamp").textContent = `Terakhir diperbarui: ${now}`;
            updateReport();
        }

        function updateReport() {
            let totalPokok = 0;
            let lastPokok = "-";
            const counts = {
                Y: 0,
                N: 0,
                AB: 0,
                TK: 0,
                NA: 0
            };
            const reportLevel = document.getElementById("reportLevel").value;

            const totalBPokokVerified = reportLevel === "all" ?
                0 :
                countTotalVerifiedBPokok(reportLevel);

            for (const key in allData) {
                totalPokok += allData[key].length;

                if (allData[key].length > 0) {
                    const last = allData[key][allData[key].length - 1];
                    lastPokok = (lastPokok === "-" || last.no_pokok > lastPokok) ? last.no_pokok : lastPokok;
                }
                allData[key].forEach(pokok => {
                    if (reportLevel === "all") {
                        if (pokok.verifikasi.askep.keputusan) counts[pokok.verifikasi.askep.keputusan]++;
                        if (pokok.verifikasi.mgr.keputusan) counts[pokok.verifikasi.mgr.keputusan]++;
                        if (pokok.verifikasi.rc.keputusan) counts[pokok.verifikasi.rc.keputusan]++;
                    } else if (pokok.verifikasi[reportLevel].keputusan) {
                        counts[pokok.verifikasi[reportLevel].keputusan]++;
                    }
                });
            }

            const adjustedN = reportLevel === "all" ?
                counts.N :
                Math.max(0, counts.N - totalBPokokVerified);

            const adjustedTotal = reportLevel === "all" ?
                totalPokok :
                Math.max(0, totalPokok - totalBPokokVerified);

            document.getElementById("totalPokok").textContent = totalPokok;
            document.getElementById("countY").textContent = counts.Y;
            document.getElementById("countN").textContent = adjustedN;
            document.getElementById("countAB").textContent = counts.AB;
            document.getElementById("countTK").textContent = counts.TK;
            document.getElementById("countNA").textContent = counts.NA;
            document.getElementById("totalAll").textContent = adjustedTotal;
            document.getElementById("lastPokok").textContent = lastPokok;

            // Perhitungan persentese
            if (adjustedTotal > 0) {
                document.getElementById("percentY").textContent = `${Math.round(counts.Y/adjustedTotal*100)}%`;
                document.getElementById("percentN").textContent = `${Math.round(adjustedN/adjustedTotal*100)}%`;
                document.getElementById("percentAB").textContent = `${Math.round(counts.AB/adjustedTotal*100)}%`;
                document.getElementById("percentTK").textContent = `${Math.round(counts.TK/adjustedTotal*100)}%`;
                document.getElementById("percentNA").textContent = `${Math.round(counts.NA/adjustedTotal*100)}%`;
            } else {
                document.getElementById("percentY").textContent = "0%";
                document.getElementById("percentN").textContent = "0%";
                document.getElementById("percentAB").textContent = "0%";
                document.getElementById("percentTK").textContent = "0%";
                document.getElementById("percentNA").textContent = "0%";
            }

            reportData = [];
            for (const key in allData) {
                const [estate, divisi, blok] = key.split("_");
                allData[key].forEach(pokok => {
                    let belowCount = 0;
                    for (let i = 1; i <= 6; i++) {
                        const d = pokok[`p${i}`];
                        if (d !== "" && parseFloat(d) > 0 && parseFloat(d) <= 6.4) {
                            belowCount++;
                        }
                    }

                    reportData.push({
                        estate,
                        divisi,
                        blok,
                        no_pokok: pokok.no_pokok,
                        p1: pokok.p1 || "",
                        p2: pokok.p2 || "",
                        p3: pokok.p3 || "",
                        p4: pokok.p4 || "",
                        p5: pokok.p5 || "",
                        p6: pokok.p6 || "",
                        below6_4Count: belowCount,
                        askep: pokok.verifikasi.askep.keputusan || "-",
                        mgr: pokok.verifikasi.mgr.keputusan || "-",
                        rc: pokok.verifikasi.rc.keputusan || "-",
                        keterangan: pokok.keterangan || "-",
                        last_updated: pokok.last_updated || ""
                    });
                });
            }

            setupReportPagination();
        }

        function setupReportPagination() {
            const pageSize = parseInt(document.getElementById('pageSizeReport').value, 10);
            const searchTerm = document.getElementById('searchReport').value.trim().toLowerCase();

            const filtered = reportData.filter(item => {
                return Object.values(item).some(v =>
                    String(v).toLowerCase().includes(searchTerm)
                );
            });

            const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

            const controlsDiv = document.getElementById('paginationReportControls');
            let currentPage = parseInt(controlsDiv.getAttribute('data-current-page')) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;
            controlsDiv.setAttribute('data-current-page', currentPage);

            renderReportPage(filtered, currentPage, pageSize, totalPages);
        }

        function renderReportPage(dataArray, page, pageSize, totalPages) {
            const tbody = document.getElementById('reportTable').getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';

            const startIdx = (page - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            const pageSlice = dataArray.slice(startIdx, endIdx);

            pageSlice.forEach(item => {
                const row = tbody.insertRow();

                // Kolom Estate, Divisi, Blok, No.Pokok
                row.insertCell(0).textContent = item.estate;
                row.insertCell(1).textContent = item.divisi;
                row.insertCell(2).textContent = item.blok;
                row.insertCell(3).textContent = item.no_pokok;

                // Kolom P1–P6 warna merah jika ≤ 6.4
                for (let i = 1; i <= 6; i++) {
                    const cell = row.insertCell(3 + i);
                    const val = item[`p${i}`];
                    cell.textContent = val === "" ? "" : val;
                    if (val !== "" && !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <=
                        6.4) {
                        cell.classList.add("red-bg");
                    }
                }

                // Kolom “≤6.4m”
                const cellBelow = row.insertCell(10);
                cellBelow.textContent = item.below6_4Count;
                if (item.below6_4Count === 1) {
                    cellBelow.classList.add("yellow-bg");
                } else if (item.below6_4Count > 1) {
                    cellBelow.classList.add("blue-bg");
                }

                // Kolom Verifikasi (Askep, MGR, RC/VPA)
                row.insertCell(11).textContent = item.askep;
                row.insertCell(12).textContent = item.mgr;
                row.insertCell(13).textContent = item.rc;

                // Kolom Keterangan & Terakhir Diubah
                row.insertCell(14).textContent = item.keterangan;
                row.insertCell(15).textContent = item.last_updated;

                // Kolom Aksi (Edit + Hapus)
                const actionCell = row.insertCell(16);
                const editBtn = document.createElement("button");
                editBtn.textContent = "Edit";
                editBtn.style.backgroundColor = "#2196F3";
                editBtn.style.color = "white";
                editBtn.style.marginRight = "5px";
                editBtn.style.padding = "4px 8px";
                editBtn.style.border = "none";
                editBtn.style.borderRadius = "3px";
                editBtn.style.cursor = "pointer";
                editBtn.onclick = function () {
                    editPokokData(`${item.estate}_${item.divisi}_${item.blok}`, item.no_pokok);
                };
                actionCell.appendChild(editBtn);

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Hapus";
                deleteBtn.style.backgroundColor = "#f44336";
                deleteBtn.style.color = "white";
                deleteBtn.style.padding = "4px 8px";
                deleteBtn.style.border = "none";
                deleteBtn.style.borderRadius = "3px";
                deleteBtn.style.cursor = "pointer";
                deleteBtn.onclick = function () {
                    deletePokokData(`${item.estate}_${item.divisi}_${item.blok}`, item.no_pokok);
                };
                actionCell.appendChild(deleteBtn);
            });

            renderReportPaginationControls(totalPages, page);
            updateHighlightedTextColor();
        }

        function renderReportPaginationControls(totalPages, currentPage) {
            const container = document.getElementById('paginationReportControls');
            container.innerHTML = '';

            if (totalPages <= 1) {
                container.removeAttribute('data-current-page');
                return;
            }

            const prevBtn = document.createElement("button");
            prevBtn.textContent = "Prev";
            prevBtn.disabled = (currentPage === 1);
            prevBtn.style.padding = "4px 8px";
            prevBtn.style.borderRadius = "3px";
            prevBtn.style.cursor = currentPage === 1 ? "not-allowed" : "pointer";
            prevBtn.onclick = () => changeReportPage(currentPage - 1);
            container.appendChild(prevBtn);

            for (let i = 1; i <= totalPages; i++) {
                if (
                    i === 1 ||
                    i === totalPages ||
                    (i >= currentPage - 1 && i <= currentPage + 1)
                ) {
                    const pageBtn = document.createElement("button");
                    pageBtn.textContent = i;
                    pageBtn.disabled = (i === currentPage);
                    pageBtn.style.padding = "4px 8px";
                    pageBtn.style.margin = "0 2px";
                    pageBtn.style.borderRadius = "3px";
                    pageBtn.style.cursor = i === currentPage ? "not-allowed" : "pointer";
                    pageBtn.onclick = () => changeReportPage(i);
                    container.appendChild(pageBtn);
                } else if (
                    (i === 2 && currentPage > 5) ||
                    (i === totalPages - 1 && currentPage < totalPages - 2)
                ) {
                    const ell = document.createElement("span");
                    ell.textContent = "...";
                    ell.style.margin = "0 4px";
                    container.appendChild(ell);
                }
            }
            const nextBtn = document.createElement("button");
            nextBtn.textContent = "Next";
            nextBtn.disabled = (currentPage === totalPages);
            nextBtn.style.padding = "4px 8px";
            nextBtn.style.borderRadius = "3px";
            nextBtn.style.cursor = currentPage === totalPages ? "not-allowed" : "pointer";
            nextBtn.onclick = () => changeReportPage(currentPage + 1);
            container.appendChild(nextBtn);

            container.setAttribute('data-current-page', currentPage);
        }

        function changeReportPage(newPage) {
            const controlsDiv = document.getElementById('paginationReportControls');
            controlsDiv.setAttribute('data-current-page', newPage);
            setupReportPagination();
        }

        // Export data ke Excel
        function exportToExcel() {
            if (!currentKey || !allData[currentKey] || allData[currentKey].length === 0) {
                alert("Tidak ada data untuk diexport!");
                return;
            }

            const estate = document.getElementById("estate").value || "TO";
            const divisi = document.getElementById("divisi").value || "1";
            const blok = document.getElementById("blok").value || "A1";

            // Persiapan data
            const exportData = allData[currentKey].map(pokok => {
                return {
                    "Estate": estate,
                    "Divisi": divisi,
                    "Blok": blok,
                    "No. Pokok": pokok.no_pokok,
                    "P1": pokok.p1,
                    "P2": pokok.p2,
                    "P3": pokok.p3,
                    "P4": pokok.p4,
                    "P5": pokok.p5,
                    "P6": pokok.p6,
                    "Keterangan": pokok.keterangan,
                    "Askep": pokok.verifikasi.askep.keputusan,
                    "Keterangan Askep": pokok.verifikasi.askep.keterangan,
                    "Waktu Askep": pokok.verifikasi.askep.timestamp || "",
                    "MGR": pokok.verifikasi.mgr.keputusan,
                    "Keterangan MGR": pokok.verifikasi.mgr.keterangan,
                    "Waktu MGR": pokok.verifikasi.mgr.timestamp || "",
                    "RC/VPA": pokok.verifikasi.rc.keputusan,
                    "Keterangan RC/VPA": pokok.verifikasi.rc.keterangan,
                    "Waktu RC/VPA": pokok.verifikasi.rc.timestamp || "",
                    "Terakhir Diubah": pokok.last_updated || ""
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data_TO");

            const fileName = `TO_${estate}_Div${divisi}_Blok${blok}_${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
        }

        // Export semua data Excel
        function exportAllToExcel() {
            if (Object.keys(allData).length === 0) {
                alert("Tidak ada data untuk diexport!");
                return;
            }

            let allExportData = [];

            for (const key in allData) {
                const [estate, divisi, blok] = key.split("_");

                allData[key].forEach(pokok => {
                    allExportData.push({
                        "Estate": estate,
                        "Divisi": divisi,
                        "Blok": blok,
                        "No. Pokok": pokok.no_pokok,
                        "P1": pokok.p1,
                        "P2": pokok.p2,
                        "P3": pokok.p3,
                        "P4": pokok.p4,
                        "P5": pokok.p5,
                        "P6": pokok.p6,
                        "Keterangan": pokok.keterangan,
                        "Askep": pokok.verifikasi.askep.keputusan,
                        "Keterangan Askep": pokok.verifikasi.askep.keterangan,
                        "Waktu Askep": pokok.verifikasi.askep.timestamp || "",
                        "MGR": pokok.verifikasi.mgr.keputusan,
                        "Keterangan MGR": pokok.verifikasi.mgr.keterangan,
                        "Waktu MGR": pokok.verifikasi.mgr.timestamp || "",
                        "RC/VPA": pokok.verifikasi.rc.keputusan,
                        "Keterangan RC/VPA": pokok.verifikasi.rc.keterangan,
                        "Waktu RC/VPA": pokok.verifikasi.rc.timestamp || "",
                        "Terakhir Diubah": pokok.last_updated || ""
                    });
                });
            }

            const ws = XLSX.utils.json_to_sheet(allExportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data_TO");

            XLSX.writeFile(wb, `TO_ALL_DATA_${new Date().toISOString().slice(0,10)}.xlsx`);
        }

        // Konfirmasi hapus semua data
        function confirmDelete() {
            if (confirm("Apakah Anda yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!")) {
                deleteAllData();
            }
        }

        // Hapus semua data
        function deleteAllData() {
            allData = {};
            localStorage.removeItem("toData");
            lastActivity = {
                saved: null,
                verified: null,
                reported: null
            };

            document.getElementById("lastSaved").textContent = "Terakhir disimpan: -";
            document.getElementById("lastVerified").textContent = "Terakhir diverifikasi: -";
            document.getElementById("reportTimestamp").textContent = "Terakhir diperbarui: -";

            updateReport();
            resetForm(true);
            updateStorageBar();
            alert("Semua data telah dihapus!");
        }

        // Simpan localStorage
        function saveToLocalStorage() {
            const dataToSave = {
                appData: allData,
                lastActivity: lastActivity
            };
            localStorage.setItem("toData", JSON.stringify(dataToSave));
            updateStorageBar();
        }

        // Muat dari localStorage
        function loadFromLocalStorage() {
            const savedData = localStorage.getItem("toData");
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                allData = parsedData.appData || {};
                lastActivity = parsedData.lastActivity || {
                    saved: null,
                    verified: null,
                    reported: null
                };

                if (lastActivity.saved) {
                    document.getElementById("lastSaved").textContent = `Terakhir disimpan: ${lastActivity.saved}`;
                }
                if (lastActivity.verified) {
                    document.getElementById("lastVerified").textContent =
                        `Terakhir diverifikasi: ${lastActivity.verified}`;
                }
                if (lastActivity.reported) {
                    document.getElementById("reportTimestamp").textContent =
                        `Terakhir diperbarui: ${lastActivity.reported}`;
                }
            }
        }

        // Tab Verifikasi
        function updateVerifikasiSummary() {
            const elVerifierLevel = document.getElementById('verifierLevel');
            const elTotalPokokVerif = document.getElementById('totalPokokVerif');
            const elCountVerifiedVerif = document.getElementById('countVerifiedVerif');
            const elCountUnverifiedVerif = document.getElementById('countUnverifiedVerif');

            if (!elVerifierLevel || !elTotalPokokVerif || !elCountVerifiedVerif || !elCountUnverifiedVerif) {
                return;
            }

            const level = elVerifierLevel.value;
            let total = 0,
                verified = 0;

            for (const key in allData) {
                allData[key].forEach(pokok => {
                    total++;
                    if (pokok.verifikasi[level].keputusan) {
                        verified++;
                    }
                });
            }

            const unverified = total - verified;
            elTotalPokokVerif.textContent = total;
            elCountVerifiedVerif.textContent = verified;
            elCountUnverifiedVerif.textContent = unverified;
        }

        // Data Pokok Belum Verifikasi
        let unverifiedData = [];

        function showUnverifiedModal() {
            const level = document.getElementById('verifierLevel').value;

            unverifiedData = [];
            for (const key in allData) {
                const [estate, divisi, blok] = key.split('_');

                allData[key].forEach(pokok => {
                    if (!pokok.verifikasi[level].keputusan) {
                        let belowCount = 0;
                        for (let i = 1; i <= 6; i++) {
                            const d = pokok[`p${i}`];
                            if (d !== "" && !isNaN(parseFloat(d)) && parseFloat(d) > 0 && parseFloat(d) <=
                                6.4) {
                                belowCount++;
                            }
                        }

                        unverifiedData.push({
                            estate,
                            divisi,
                            blok,
                            no_pokok: pokok.no_pokok || "",
                            p1: pokok.p1 || "",
                            p2: pokok.p2 || "",
                            p3: pokok.p3 || "",
                            p4: pokok.p4 || "",
                            p5: pokok.p5 || "",
                            p6: pokok.p6 || "",
                            below6_4Count: belowCount,
                            askep: pokok.verifikasi.askep.keputusan || "-",
                            mgr: pokok.verifikasi.mgr.keputusan || "-",
                            rc: pokok.verifikasi.rc.keputusan || "-",
                            keterangan: pokok.keterangan || "-",
                            last_updated: pokok.last_updated || ""
                        });
                    }
                });
            }

            document.getElementById('totalUnverifiedCount').textContent = unverifiedData.length;

            document.getElementById('unverifiedModal').style.display = 'block';
            updateHighlightedTextColor();

            setupUnverifiedPagination();
        }

        function closeUnverifiedModal() {
            document.getElementById('unverifiedModal').style.display = 'none';
        }

        // Pengaturan Paging untuk tabel belum verifikasi
        function setupUnverifiedPagination() {
            const pageSize = parseInt(document.getElementById('pageSizeUnverified').value, 10);
            const searchTerm = document.getElementById('searchUnverified').value.trim().toLowerCase();

            const filtered = unverifiedData.filter(item => {
                return Object.values(item).some(v =>
                    String(v).toLowerCase().includes(searchTerm)
                );
            });

            const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

            const controlsDiv = document.getElementById('paginationUnverifiedControls');
            let currentPage = parseInt(controlsDiv.getAttribute('data-current-page')) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;
            controlsDiv.setAttribute('data-current-page', currentPage);

            renderUnverifiedPage(filtered, currentPage, pageSize, totalPages);
        }

        function renderUnverifiedPage(dataArray, page, pageSize, totalPages) {
            const tbody = document.getElementById('unverifiedTable').querySelector('tbody');
            tbody.innerHTML = '';

            const startIdx = (page - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            const pageSlice = dataArray.slice(startIdx, endIdx);

            pageSlice.forEach(item => {
                const row = tbody.insertRow();

                // Estate, Divisi, Blok, No.Pokok
                row.insertCell(0).textContent = item.estate;
                row.insertCell(1).textContent = item.divisi;
                row.insertCell(2).textContent = item.blok;
                row.insertCell(3).textContent = item.no_pokok;

                for (let i = 1; i <= 6; i++) {
                    const cell = row.insertCell(3 + i);
                    const val = item[`p${i}`];
                    cell.textContent = val === "" ? "" : val;
                    if (val !== "" && !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <=
                        6.4) {
                        cell.classList.add('red-bg');
                    }
                }

                // Kolom “≤6.4m”
                const cellBelow = row.insertCell(10);
                cellBelow.textContent = item.below6_4Count;
                if (item.below6_4Count === 1) {
                    cellBelow.classList.add('yellow-bg');
                } else if (item.below6_4Count > 1) {
                    cellBelow.classList.add('blue-bg');
                }

                // Kolom Verifikasi Askep, MGR, RC/VPA
                row.insertCell(11).textContent = item.askep;
                row.insertCell(12).textContent = item.mgr;
                row.insertCell(13).textContent = item.rc;

                // Kolom Note & Terakhir Diubah
                row.insertCell(14).textContent = item.keterangan;
                row.insertCell(15).textContent = item.last_updated;
            });

            renderUnverifiedPaginationControls(totalPages, page);
            updateHighlightedTextColor();
        }

        function renderUnverifiedPaginationControls(totalPages, currentPage) {
            const container = document.getElementById('paginationUnverifiedControls');
            container.innerHTML = '';

            if (totalPages <= 1) {
                container.removeAttribute('data-current-page');
                return;
            }

            const prevBtn = document.createElement('button');
            prevBtn.textContent = 'Prev';
            prevBtn.disabled = (currentPage === 1);
            prevBtn.style.padding = '4px 8px';
            prevBtn.style.margin = '0 2px';
            prevBtn.style.borderRadius = '3px';
            prevBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
            prevBtn.onclick = () => changeUnverifiedPage(currentPage - 1);
            container.appendChild(prevBtn);

            for (let i = 1; i <= totalPages; i++) {
                if (
                    i === 1 ||
                    i === totalPages ||
                    (i >= currentPage - 1 && i <= currentPage + 1)
                ) {
                    const pageBtn = document.createElement('button');
                    pageBtn.textContent = i;
                    pageBtn.disabled = (i === currentPage);
                    pageBtn.style.padding = '4px 8px';
                    pageBtn.style.margin = '0 2px';
                    pageBtn.style.borderRadius = '3px';
                    pageBtn.style.cursor = i === currentPage ? 'not-allowed' : 'pointer';
                    pageBtn.onclick = () => changeUnverifiedPage(i);
                    container.appendChild(pageBtn);
                } else if (
                    (i === 2 && currentPage > 4) ||
                    (i === totalPages - 1 && currentPage < totalPages - 3)
                ) {
                    const ell = document.createElement('span');
                    ell.textContent = '...';
                    ell.style.margin = '0 4px';
                    container.appendChild(ell);
                }
            }

            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next';
            nextBtn.disabled = (currentPage === totalPages);
            nextBtn.style.padding = '4px 8px';
            nextBtn.style.margin = '0 2px';
            nextBtn.style.borderRadius = '3px';
            nextBtn.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
            nextBtn.onclick = () => changeUnverifiedPage(currentPage + 1);
            container.appendChild(nextBtn);

            container.setAttribute('data-current-page', currentPage);
        }

        function changeUnverifiedPage(newPage) {
            const controlsDiv = document.getElementById('paginationUnverifiedControls');
            controlsDiv.setAttribute('data-current-page', newPage);
            setupUnverifiedPagination();
        }

        // URL GAS
        const GOOGLE_APPS_SCRIPT_URL =
            'https://script.google.com/macros/s/AKfycbz7HD5p_LuJHooazTfOapSpX4xbvPKWoqUxuM-57DwqNZQC79MDqNG2wS7VPOOgeR20cg/exec';

        function syncToGoogleSheet() {
            const btn = document.getElementById('btnSyncGoogleSheet');
            const status = document.getElementById('syncStatus');
            btn.disabled = true;
            status.textContent = 'Mengirim data...';

            let exportData = [];
            for (const key in allData) {
                const [estate, divisi, blok] = key.split("_");
                allData[key].forEach(pokok => {
                    exportData.push({
                        Estate: estate,
                        Divisi: divisi,
                        Blok: blok,
                        No_Pokok: pokok.no_pokok,
                        P1: pokok.p1,
                        P2: pokok.p2,
                        P3: pokok.p3,
                        P4: pokok.p4,
                        P5: pokok.p5,
                        P6: pokok.p6,
                        Keterangan: pokok.keterangan,
                        Askep: pokok.verifikasi.askep.keputusan,
                        Keterangan_Askep: pokok.verifikasi.askep.keterangan,
                        Waktu_Askep: pokok.verifikasi.askep.timestamp || "",
                        MGR: pokok.verifikasi.mgr.keputusan,
                        Keterangan_MGR: pokok.verifikasi.mgr.keterangan,
                        Waktu_MGR: pokok.verifikasi.mgr.timestamp || "",
                        RC_VPA: pokok.verifikasi.rc.keputusan,
                        Keterangan_RC_VPA: pokok.verifikasi.rc.keterangan,
                        Waktu_RC_VPA: pokok.verifikasi.rc.timestamp || "",
                        Terakhir_Diubah: pokok.last_updated || ""
                    });
                });
            }

            // Kirim ke GAS
            fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        action: "sync",
                        data: exportData
                    })
                })
                .then(() => {
                    status.textContent = "✅ Selesai!";
                    btn.disabled = false;
                })
                .catch(err => {
                    status.textContent = "❌ Gagal: " + err;
                    btn.disabled = false;
                });
        }

        // Dark mode
        document.addEventListener('DOMContentLoaded', function () {
            const darkModeEnabled = localStorage.getItem('darkMode') === 'enabled';
            if (darkModeEnabled) {
                document.body.classList.add('dark-mode');
                updateHighlightedTextColor();
            }

            const darkModeToggle = document.createElement('button');
            darkModeToggle.id = 'darkModeToggle';
            darkModeToggle.innerHTML = darkModeEnabled ? '☀️' : '🌙';
            darkModeToggle.title = 'Toggle Dark Mode';
            document.body.appendChild(darkModeToggle);

            darkModeToggle.addEventListener('click', function () {
                document.body.classList.toggle('dark-mode');
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
                darkModeToggle.innerHTML = isDarkMode ? '☀️' : '🌙';
                updateHighlightedTextColor();
            });

        });

        // Perbandingan pokok pindahan
        let pokokBData = [];

        function showPokokBModal() {
            pokokBData = [];
            for (const key in allData) {
                const [estate, divisi, blok] = key.split('_');

                allData[key].forEach(pokok => {
                    if (pokok.no_pokok.includes('B')) {
                        const baseNumber = pokok.no_pokok.replace('B', '');
                        const pokokTanpaB = allData[key].find(p => p.no_pokok === baseNumber);

                        let status = "Sama";
                        if (!pokokTanpaB) {
                            status = "Tanpa B tidak ada";
                        } else {
                            const verifikasiB = pokok.verifikasi;
                            const verifikasiTanpaB = pokokTanpaB.verifikasi;

                            if (verifikasiB.askep.keputusan !== verifikasiTanpaB.askep.keputusan ||
                                verifikasiB.mgr.keputusan !== verifikasiTanpaB.mgr.keputusan ||
                                verifikasiB.rc.keputusan !== verifikasiTanpaB.rc.keputusan) {
                                status = "OK";
                            }
                        }

                        pokokBData.push({
                            blok: `${estate}-${divisi}-${blok}`,
                            no_pokok: `${pokok.no_pokok} vs ${baseNumber}`,
                            b_askep: pokok.verifikasi.askep.keputusan || "-",
                            b_mgr: pokok.verifikasi.mgr.keputusan || "-",
                            b_rc: pokok.verifikasi.rc.keputusan || "-",
                            tanpa_b_askep: pokokTanpaB ? (pokokTanpaB.verifikasi.askep.keputusan ||
                                "-") : "-",
                            tanpa_b_mgr: pokokTanpaB ? (pokokTanpaB.verifikasi.mgr.keputusan || "-") : "-",
                            tanpa_b_rc: pokokTanpaB ? (pokokTanpaB.verifikasi.rc.keputusan || "-") : "-",
                            status: status
                        });
                    }
                });
            }

            document.getElementById('totalPokokBCount').textContent = pokokBData.length;

            document.getElementById('pokokBModal').style.display = 'block';
            updateHighlightedTextColor();

            setupPokokBPagination();
        }

        function closePokokBModal() {
            document.getElementById('pokokBModal').style.display = 'none';
        }

        // Pengaturan Paging untuk Pokok Pindahan
        function setupPokokBPagination() {
            const pageSize = parseInt(document.getElementById('pageSizePokokB').value, 10);
            const searchTerm = document.getElementById('searchPokokB').value.trim().toLowerCase();

            const filtered = pokokBData.filter(item => {
                return Object.values(item).some(v =>
                    String(v).toLowerCase().includes(searchTerm)
                );
            });

            const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

            const controlsDiv = document.getElementById('paginationPokokBControls');
            let currentPage = parseInt(controlsDiv.getAttribute('data-current-page')) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;
            controlsDiv.setAttribute('data-current-page', currentPage);

            renderPokokBPage(filtered, currentPage, pageSize, totalPages);
        }

        function renderPokokBPage(dataArray, page, pageSize, totalPages) {
            const tbody = document.getElementById('pokokBTable').querySelector('tbody');
            tbody.innerHTML = '';

            const startIdx = (page - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            const pageSlice = dataArray.slice(startIdx, endIdx);

            pageSlice.forEach(item => {
                const row = tbody.insertRow();

                row.insertCell(0).textContent = item.blok;
                row.insertCell(1).textContent = item.no_pokok;

                const bAskepCell = row.insertCell(2);
                bAskepCell.textContent = item.b_askep;

                const bMgrCell = row.insertCell(3);
                bMgrCell.textContent = item.b_mgr;

                const bRcCell = row.insertCell(4);
                bRcCell.textContent = item.b_rc;

                const tanpaBAskepCell = row.insertCell(5);
                tanpaBAskepCell.textContent = item.tanpa_b_askep;

                const tanpaBMgrCell = row.insertCell(6);
                tanpaBMgrCell.textContent = item.tanpa_b_mgr;

                const tanpaBRcCell = row.insertCell(7);
                tanpaBRcCell.textContent = item.tanpa_b_rc;

                const statusCell = row.insertCell(8);
                statusCell.textContent = item.status;

                // Warna status
                if (item.status === "OK") {
                    statusCell.style.backgroundColor = "#ffcccc";
                    statusCell.style.color = "black";
                } else if (item.status === "Tanpa B tidak ada") {
                    statusCell.style.backgroundColor = "#ffffcc";
                    statusCell.style.color = "black";
                }
            });

            renderPokokBPaginationControls(totalPages, page);
            updateHighlightedTextColor();
        }

        function renderPokokBPaginationControls(totalPages, currentPage) {
            const container = document.getElementById('paginationPokokBControls');
            container.innerHTML = '';

            if (totalPages <= 1) {
                container.removeAttribute('data-current-page');
                return;
            }

            const prevBtn = document.createElement('button');
            prevBtn.textContent = 'Prev';
            prevBtn.disabled = (currentPage === 1);
            prevBtn.style.padding = '4px 8px';
            prevBtn.style.margin = '0 2px';
            prevBtn.style.borderRadius = '3px';
            prevBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
            prevBtn.onclick = () => changePokokBPage(currentPage - 1);
            container.appendChild(prevBtn);

            for (let i = 1; i <= totalPages; i++) {
                if (
                    i === 1 ||
                    i === totalPages ||
                    (i >= currentPage - 1 && i <= currentPage + 1)
                ) {
                    const pageBtn = document.createElement('button');
                    pageBtn.textContent = i;
                    pageBtn.disabled = (i === currentPage);
                    pageBtn.style.padding = '4px 8px';
                    pageBtn.style.margin = '0 2px';
                    pageBtn.style.borderRadius = '3px';
                    pageBtn.style.cursor = i === currentPage ? 'not-allowed' : 'pointer';
                    pageBtn.onclick = () => changePokokBPage(i);
                    container.appendChild(pageBtn);
                } else if (
                    (i === 2 && currentPage > 4) ||
                    (i === totalPages - 1 && currentPage < totalPages - 3)
                ) {
                    const ell = document.createElement('span');
                    ell.textContent = '...';
                    ell.style.margin = '0 4px';
                    container.appendChild(ell);
                }
            }

            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next';
            nextBtn.disabled = (currentPage === totalPages);
            nextBtn.style.padding = '4px 8px';
            nextBtn.style.margin = '0 2px';
            nextBtn.style.borderRadius = '3px';
            nextBtn.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
            nextBtn.onclick = () => changePokokBPage(currentPage + 1);
            container.appendChild(nextBtn);

            container.setAttribute('data-current-page', currentPage);
        }

        function changePokokBPage(newPage) {
            const controlsDiv = document.getElementById('paginationPokokBControls');
            controlsDiv.setAttribute('data-current-page', newPage);
            setupPokokBPagination();
        }

        // BAR STATUS PENGGUNAAN LOCAL STORAGE
        function getLocalStorageUsage() {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                total += key.length + (val ? val.length : 0);
            }
            return total;
        }

        function updateStorageBar() {
            const usedBytes = getLocalStorageUsage();
            const maxBytes = 5 * 1024 * 1024;
            const freeBytes = Math.max(maxBytes - usedBytes, 0);
            const percent = Math.min(usedBytes / maxBytes * 100, 100);
            let color = "#3498db";
            if (percent > 80) color = "#e74c3c";
            else if (percent > 60) color = "#f1c40f";

            // Update bar
            const bar = document.getElementById("storage-bar");
            bar.style.width = percent + "%";
            bar.style.background = color;

            // Info teks
            const freeMB = (freeBytes / (1024 * 1024)).toFixed(2);
            const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
            let info = `${freeMB} MB free of ${maxMB} MB`;

            const infoText = document.getElementById("storage-info-text");
            infoText.textContent = info;
        }

        document.addEventListener("DOMContentLoaded", function () {
            updateStorageBar();
        });

        // ================= MAP, TRACKING, PLACEMARK =====================

let map, userMarker, trackingPolyline, placemarksLayer, offlineImageLayer, trackingHistoryLayer;
let trackingActive = false;
let trackingPaused = false;
let trackingAutoPaused = false;     // Auto-pause (tidak mematikan GPS watcher)
let trackingWatchId = null;
let trackingData = [];
let trackingStartTime = null;
let trackingPauseTime = null;
let placemarks = JSON.parse(localStorage.getItem("geoPlacemarks") || "[]");
let userLocationWatchId = null;

// ====== Persisted keys & defaults ======
const ACTIVE_SESSION_KEY     = "trackingActiveSessionTO";
const ACTIVE_SESSION_ID_KEY  = "trackingActiveSessionTO_id";
const HISTORY_KEY            = "trackingHistoryTO";
const TRACK_COLOR_KEY        = "trackingColorTO";
const NW_KEY                 = "offlineMapNW";
const SE_KEY                 = "offlineMapSE";
let trackingColor = localStorage.getItem(TRACK_COLOR_KEY) || "#ff5500";
const LEGEND_VISIBLE_KEY = "trackLegendVisibleTO";   // simpan status legend (true/false)
let lastUserLatLng = null;                           // posisi user terakhir (untuk re-center compass)

// ====== Konfigurasi (boleh diubah sesuai kebutuhan) ======
const ACCURACY_THRESHOLD_M   = 50;      // Titik dengan akurasi lebih buruk dari ini diabaikan
const SPEED_PAUSE_THRESH_MPS = 0.3;     // Auto-pause jika kecepatan di bawah ini...
const IDLE_PAUSE_SECS        = 20;      // ...selama detik ini
const RESUME_SPEED_MPS       = 0.6;     // Auto-resume jika kecepatan di atas ini
const SIMPLIFY_TOLERANCE_M   = 3;       // Simplifikasi jalur saat Stop (toleransi meter)

// ====== State tambahan untuk Auto-Pause & statistik ======
let lastSpeedRef = null;     // {lat, lng, t} sebagai referensi hitung kecepatan
let idleAccumMs  = 0;

// ====== Wake Lock (layar tetap nyala saat tracking) ======
let wakeLock = null;
async function requestWakeLock(){
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', ()=> console.log('[WakeLock] released'));
      console.log('[WakeLock] acquired');
    }
  } catch(e){ console.warn('[WakeLock] error:', e); }
}
function releaseWakeLock(){
  if (wakeLock) { wakeLock.release().catch(()=>{}); wakeLock = null; }
}
document.addEventListener('visibilitychange', ()=>{
  if (document.visibilityState === 'visible' && trackingActive && !trackingPaused) requestWakeLock();
});

// ====== Kompas / Rotasi Peta ======
let mapRotateMode = 'static'; // 'static' | 'compass' | 'free'
let mapBearingDeg = 0;
let deviceOrientationListener = null;
function setMapRotateMode(nextMode){
  if (!map) return;
  if (nextMode === 'compass') {
    enableCompassMode();
  } else if (nextMode === 'free') {
    enableFreeRotateMode();
  } else {
    disableRotation();
  }
}
function disableRotation(){
  mapRotateMode = 'static';
  mapBearingDeg = 0;
  applyMapRotationToPane();
  teardownDeviceOrientation();
  detachCompassCenterLock();
  setCompassBadge('N');
}
function enableCompassMode(){
  mapRotateMode = 'compass';
  setCompassBadge('C');

  // Minta izin sensor (iOS) via klik kompas (sudah dianggap user gesture)
  try {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(state=>{
        if (state === 'granted') {
          attachDeviceOrientation();
          attachCompassCenterLock();
          keepUserCenteredCompass();
        } else {
          alert('Akses kompas ditolak.');
        }
      });
    } else {
      attachDeviceOrientation();
      attachCompassCenterLock();
      keepUserCenteredCompass();
    }
  } catch(e){ console.warn('Compass permission error:', e); }

  // Pastikan transform-origin di tengah viewport (poros putar)
  const pane = map.getPanes().mapPane;
  pane.style.transformOrigin = '50% 50%';
}
function attachDeviceOrientation(){
  teardownDeviceOrientation();
  deviceOrientationListener = (evt)=>{
    const alpha = evt.alpha; // 0..360
    if (alpha == null) return;

    // 1) Pastikan pusat tepat di posisi user
    keepUserCenteredCompass();

    // 2) Update bearing & terapkan rotasi
    mapBearingDeg = 360 - alpha;

    // Terapkan setelah pan selesai (frame berikut) untuk kurangi flicker
    requestAnimationFrame(applyMapRotationToPane);
  };
  window.addEventListener('deviceorientation', deviceOrientationListener, { passive: true });

  // Saat baru attach, langsung pastikan terkunci di tengah
  keepUserCenteredCompass();
  requestAnimationFrame(applyMapRotationToPane);
}
function teardownDeviceOrientation(){
  if (deviceOrientationListener){
    window.removeEventListener('deviceorientation', deviceOrientationListener);
    deviceOrientationListener = null;
  }
}
function enableFreeRotateMode(){
  mapRotateMode = 'free';
  setCompassBadge('F');
  enableTwoFingerRotate();
  teardownDeviceOrientation();
  detachCompassCenterLock();
}
function setCompassBadge(ch){
  const el = document.getElementById('compassBadge');
  if (el) el.textContent = ch;
}
function applyMapRotationToPane(){
  if (!map) return;
  const pane = map.getPanes().mapPane;
  pane.style.transformOrigin = '50% 50%';
  const tr = pane.style.transform || '';
  const trNoRotate = tr.replace(/ rotate\([^)]+\)/, '');
  pane.style.transform = `${trNoRotate} rotate(${mapBearingDeg}deg)`;
}
function ensureCompassControl(){
  const container = map.getContainer();
  if (document.getElementById('compassControl')) return;
  const ctrl = document.createElement('div');
  ctrl.id = 'compassControl';
  ctrl.style.cssText = `
    position:absolute; right:12px; top:12px; z-index:1000; 
    width:40px; height:40px; border-radius:20px; background:#fff; 
    box-shadow:0 2px 8px rgba(0,0,0,.25); display:flex; align-items:center; justify-content:center;
    cursor:pointer; user-select:none;
  `;
  // Icon sederhana
  ctrl.innerHTML = `
    <div style="position:relative; width:26px; height:26px;">
      <div style="position:absolute; left:50%; top:-4px; width:2px; height:34px; background:#e74c3c; transform:translateX(-50%)"></div>
      <div id="compassBadge" style="position:absolute; right:-10px; bottom:-6px; font-size:10px; background:#007bff; color:#fff; padding:2px 4px; border-radius:10px;">N</div>
    </div>
  `;
  ctrl.title = 'Klik untuk ganti mode rotate: Static → Compass → Free';
  ctrl.addEventListener('click', ()=>{
    mapRotateMode = (mapRotateMode === 'static') ? 'compass' : (mapRotateMode === 'compass' ? 'free' : 'static');
    setMapRotateMode(mapRotateMode);
  });
  container.appendChild(ctrl);
}
function enableTwoFingerRotate(){
  const pane = map.getContainer();
  let rotating = false, startAngle=0, baseBearing=mapBearingDeg;

  function angleOfTouches(touches){
    const [a,b] = [touches[0], touches[1]];
    const dx = b.clientX - a.clientX, dy = b.clientY - a.clientY;
    return Math.atan2(dy, dx) * 180/Math.PI;
  }
  function onStart(e){
    if (mapRotateMode!=='free') return;
    if (e.touches && e.touches.length===2){
      rotating = true;
      startAngle = angleOfTouches(e.touches);
      baseBearing = mapBearingDeg;
      e.preventDefault();
    }
  }
  function onMove(e){
    if (!rotating || mapRotateMode!=='free') return;
    if (e.touches && e.touches.length===2){
      const ang = angleOfTouches(e.touches);
      const delta = ang - startAngle;
      mapBearingDeg = (baseBearing + delta) % 360;
      applyMapRotationToPane();
      e.preventDefault();
    }
  }
  function onEnd(){ rotating=false; }
  // Bind once
  if (!pane._rotBind){
    pane.addEventListener('touchstart', onStart, {passive:false});
    pane.addEventListener('touchmove',  onMove,  {passive:false});
    pane.addEventListener('touchend',   onEnd,   {passive:true});
    pane._rotBind = true;
  }
}

// ====== Helpers umum ======
function getCurrentBlokLabel() {
  let estate = document.getElementById("estate")?.value?.trim() || "-";
  let divisi = document.getElementById("divisi")?.value?.trim() || "-";
  let blok   = document.getElementById("blok")?.value?.trim()   || "-";
  return `${estate}${divisi}${blok}`;
}
function saveActiveTrackingSession() {
  try {
    if (!trackingStartTime || !trackingData || trackingData.length === 0) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return;
    }
    const id = Number(localStorage.getItem(ACTIVE_SESSION_ID_KEY)) || Date.now();
    const session = {
      id,
      startTime: trackingStartTime,
      date: new Date(trackingStartTime).toLocaleString(),
      blok: getCurrentBlokLabel(),
      color: trackingColor,
      points: trackingData
    };
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, String(id));
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch(e){ console.warn("[TO] saveActiveTrackingSession error:", e); }
}
function restoreActiveTrackingSession(resumeWatch=false){
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session || !Array.isArray(session.points) || session.points.length === 0) return false;

    trackingData = session.points;
    trackingStartTime = session.startTime || Date.now();
    trackingColor = session.color || trackingColor;

    if (trackingPolyline) trackingPolyline.setStyle({color: trackingColor});
    updateGeoMapTracking(trackingData);

    document.getElementById("btnTrackStart").disabled = true;
    document.getElementById("btnTrackPause").disabled = false;
    document.getElementById("btnTrackStop").disabled  = true;

    trackingActive = true;
    if (resumeWatch) startTracking(/*fromRestore*/true);

    updateTrackingStatus(`Memulihkan sesi aktif: ${trackingData.length} titik.`);
    return true;
  } catch(e){
    console.warn("[TO] restoreActiveTrackingSession error:", e);
    return false;
  }
}

// === PATCH: Toggle Legend & Compass Centering ===

// Tampilkan/sembunyikan legend + simpan preferensi
function toggleLegendVisibility(force){
  const lg = document.getElementById('trackLegend');
  if (!lg) return;
  let visible = lg.style.display !== 'none';
  if (typeof force === 'boolean') visible = !force; // agar bisa dipaksa sesuai argumen
  lg.style.display = visible ? 'none' : 'block';
  localStorage.setItem(LEGEND_VISIBLE_KEY, String(!visible));
  // Update tampilan tombol
  const btn = document.getElementById('legendToggleControl');
  if (btn){
    btn.dataset.active = (!visible) ? '1' : '0';
    btn.title = (!visible) ? 'Sembunyikan legenda' : 'Tampilkan legenda';
  }
}

// Pastikan tombol toggle legend tersedia
function ensureLegendToggleControl(){
  if (!map) return;
  const container = map.getContainer();
  if (document.getElementById('legendToggleControl')) return;

  const btn = document.createElement('button');
  btn.id = 'legendToggleControl';
  btn.type = 'button';
  btn.textContent = 'Legend';
  btn.title = 'Tampilkan/Sembunyikan legenda tracing';
  btn.style.cssText = `
    position:absolute; left:12px; bottom:12px; z-index:1001;
    background:#ffffff; color:#333; border:1px solid #ccc; border-radius:20px;
    padding:6px 12px; font-size:12px; box-shadow:0 2px 8px rgba(0,0,0,.15);
    cursor:pointer; user-select:none;
  `;
  btn.addEventListener('click', ()=> toggleLegendVisibility());
  container.appendChild(btn);

  // Set state awal dari localStorage
  const wantVisible = (localStorage.getItem(LEGEND_VISIBLE_KEY) ?? 'true') !== 'false';
  btn.dataset.active = wantVisible ? '1' : '0';
  btn.title = wantVisible ? 'Sembunyikan legenda' : 'Tampilkan legenda';
}

// Koreksi pusat peta ke posisi user secara pixel-perfect (tanpa animasi)
function centerOnUserPixelSafe(){
  if (!map || !lastUserLatLng) return;
  // Titik user pada layar (sebelum rotasi CSS diterapkan)
  const pUser = map.latLngToContainerPoint(lastUserLatLng);
  const size  = map.getSize();
  const cx = size.x / 2, cy = size.y / 2;
  const dx = cx - pUser.x;
  const dy = cy - pUser.y;
  // Hindari jitter: koreksi hanya bila > 0.5 px
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    map.panBy([dx, dy], { animate: false });
  }
}

// Jaga user tetap di tengah saat mode kompas aktif
function keepUserCenteredCompass(){
  if (mapRotateMode === 'compass') {
    centerOnUserPixelSafe();
  }
}

/* 2) ADD — handler kunci pusat saat kompas aktif */
let compassCenterLockHandler = null;
function attachCompassCenterLock(){
  if (!map) return;
  if (!compassCenterLockHandler){
    compassCenterLockHandler = ()=> keepUserCenteredCompass();
  }
  // Lock pada berbagai event agar selalu snap back ke tengah
  map.on('move moveend zoom zoomend viewreset', compassCenterLockHandler);
}
function detachCompassCenterLock(){
  if (!map || !compassCenterLockHandler) return;
  map.off('move moveend zoom zoomend viewreset', compassCenterLockHandler);
}

// ====== Legenda & layer riwayat per sesi ======
const historyLayersById = Object.create(null);
function renderTrackingHistoryOnMap(){
  if (!map) return;
  if (!trackingHistoryLayer) trackingHistoryLayer = L.layerGroup().addTo(map);
  trackingHistoryLayer.clearLayers();
  Object.keys(historyLayersById).forEach(k=>{
    const lyr = historyLayersById[k];
    if (lyr && map.hasLayer(lyr)) map.removeLayer(lyr);
  });
  for (const k in historyLayersById) delete historyLayersById[k];

  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history.forEach(h => {
    if (!h.points || h.points.length < 2) return;
    const latlngs = h.points.map(p => [p.latitude, p.longitude]);
    const color = h.color || "#888888";
    const poly  = L.polyline(latlngs, { color, weight: 3, opacity: 0.95 });
    poly.addTo(trackingHistoryLayer).bindPopup(`${h.date || ""}<br>${h.blok || ""}`);
    historyLayersById[h.id] = poly;
  });
  renderTrackingLegend();
}
function renderTrackingLegend(){
  if (!map) return;
  const container = map.getContainer();
  let legend = document.getElementById('trackLegend');
  if (!legend){
    legend = document.createElement('div');
    legend.id = 'trackLegend';
    legend.style.cssText = `
      position:absolute; left:12px; bottom:56px; max-height:45%; overflow:auto;
      z-index:1000; background:#fff; border-radius:10px; padding:8px 10px;
      box-shadow:0 2px 10px rgba(0,0,0,.25); font-size:12px; min-width:190px;
    `;
    const title = document.createElement('div');
    title.textContent = 'Legenda Tracing';
    title.style.cssText = 'font-weight:600; margin-bottom:6px; cursor:pointer;';
    // Klik judul juga bisa toggle
    title.addEventListener('click', ()=> toggleLegendVisibility());
    legend.appendChild(title);
    container.appendChild(legend);
  }
  // Bersihkan item lama
  legend.querySelectorAll('.legend-row')?.forEach(el=>el.remove());

  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history.slice().reverse().forEach(h=>{
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.style.cssText = 'display:flex; align-items:center; gap:8px; margin:4px 0;';
    const sw = document.createElement('span');
    sw.style.cssText = `display:inline-block; width:14px; height:14px; border-radius:3px; background:${h.color||'#888'};`;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', ()=>{
      const poly = historyLayersById[h.id];
      if (!poly) return;
      if (cb.checked) poly.addTo(trackingHistoryLayer);
      else            trackingHistoryLayer.removeLayer(poly);
    });
    const txt = document.createElement('div');
    txt.textContent = `${h.blok||'-'} • ${new Date(h.date||Date.now()).toLocaleString()}`;
    txt.style.flex = '1';
    row.appendChild(cb); row.appendChild(sw); row.appendChild(txt);
    legend.appendChild(row);
  });

  // Terapkan visibility dari preferensi
  const wantVisible = (localStorage.getItem(LEGEND_VISIBLE_KEY) ?? 'true') !== 'false';
  legend.style.display = wantVisible ? 'block' : 'none';

  // Pastikan tombol toggle ada & sinkron
  ensureLegendToggleControl();
  const btn = document.getElementById('legendToggleControl');
  if (btn){
    btn.dataset.active = wantVisible ? '1' : '0';
    btn.title = wantVisible ? 'Sembunyikan legenda' : 'Tampilkan legenda';
  }
}

// ====== Filter akurasi, Auto-Pause, perhitungan jarak/kecepatan ======
function haversineMeters(a,b){
  const R=6371000;
  const toRad=x=>x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}
function computeSpeedMps(prev, now){
  const dt = (now.t - prev.t)/1000;
  if (dt<=0) return 0;
  const d  = haversineMeters(prev, now);
  return d/dt;
}

// ====== Simplifikasi (Douglas–Peucker) dalam meter ======
function simplifyPath(points, toleranceM){
  if (!points || points.length<3) return points || [];
  const toXY = (lat,lng) => ({x: lng*111320, y: lat*110540}); // approx meter projection
  const sqr = x=>x*x;
  const dist2 = (p,a,b)=>{
    const A=toXY(a.latitude,a.longitude), B=toXY(b.latitude,b.longitude), P=toXY(p.latitude,p.longitude);
    const dx=B.x-A.x, dy=B.y-A.y;
    if (dx===0 && dy===0) return sqr(P.x-A.x)+sqr(P.y-A.y);
    const t=((P.x-A.x)*dx+(P.y-A.y)*dy)/(dx*dx+dy*dy);
    const tt=Math.max(0,Math.min(1,t));
    const X=A.x+tt*dx, Y=A.y+tt*dy;
    return sqr(P.x-X)+sqr(P.y-Y);
  };
  const out=[0], stack=[[0,points.length-1]];
  const tol2=toleranceM*toleranceM;
  while(stack.length){
    const [s,e]=stack.pop();
    let idx=-1, maxd=0;
    for(let i=s+1;i<e;i++){
      const d=dist2(points[i], points[s], points[e]);
      if (d>maxd){ idx=i; maxd=d; }
    }
    if (maxd>tol2){
      stack.push([s,idx],[idx,e]);
      out.push(idx);
    }
  }
  out.push(points.length-1);
  out.sort((a,b)=>a-b);
  return out.map(i=>points[i]);
}

// ================== GPS user watcher (tetap) ==================
function startUserLocationWatcher() {
  if (!navigator.geolocation) {
    updateTrackingStatus('Perangkat tidak mendukung GPS!');
    return;
  }
  if (userLocationWatchId !== null) {
    navigator.geolocation.clearWatch(userLocationWatchId);
    userLocationWatchId = null;
  }
  userLocationWatchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      lastUserLatLng = [latitude, longitude];

      if (userMarker) {
        userMarker.setLatLng(lastUserLatLng);
        if (!map._userCentered) {
          map.setView(lastUserLatLng, map.getZoom());
          map._userCentered = true;
        }
      }

      // Kunci user di tengah jika kompas aktif
      keepUserCenteredCompass();

      updateTrackingStatus(`Posisi Anda: (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
    },
    err => { updateTrackingStatus('Gagal ambil posisi: ' + err.message); },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

// ================== Inisialisasi MAP & Layer (modifikasi) ==================
function initGeoMap() {
  if (map) return;
  map = L.map('geo-map', { zoomControl: true, attributionControl: false }).setView([-2.27, 113.92], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  placemarksLayer = L.layerGroup().addTo(map);
  trackingHistoryLayer = L.layerGroup().addTo(map);
  trackingPolyline = L.polyline([], { color: trackingColor, weight: 5 }).addTo(map);
  userMarker = L.circleMarker([0, 0], { radius: 8, color: 'red', fillColor: '#f66', fillOpacity: 1 }).addTo(map);

  setupTrackColorPicker();
  loadPersistedNWSE();
  setupPullToRefreshBlocker();

  renderTrackingHistoryOnMap();
  restorePlacemarks();
  renderPlacemarkTable();
  startUserLocationWatcher();

  ensureCompassControl();
  keepUserCenteredCompass(); // aman walau belum ada GPS fix
  ensureLegendToggleControl();        // <— tombol Legend selalu dibuat
  setMapRotateMode('static');

  // Pulihkan sesi aktif bila user refresh
  restoreActiveTrackingSession(true);

  // Re-apply rotasi setiap map bergerak
  map.on('move zoom viewreset moveend zoomend', applyMapRotationToPane);
}

// ================== TRACKING REAL TIME (modifikasi: wakelock, akurasi, auto-pause/resume) ==================
function startTracking(fromRestore = false) {
  // --- Guard & state awal ---
  if (!navigator.geolocation) {
    alert('Perangkat tidak mendukung GPS!');
    return;
  }
  if (trackingActive && !trackingPaused) return;

  trackingActive = true;
  trackingPaused = false;
  trackingAutoPaused = false;

  trackingData = trackingData || [];
  if (!fromRestore) trackingStartTime = trackingStartTime || Date.now();
  trackingPauseTime = null;

  // --- UI & housekeeping ---
  document.getElementById("btnTrackStart").disabled = true;
  document.getElementById("btnTrackPause").disabled = false;
  document.getElementById("btnTrackStop").disabled  = false;
  updateTrackingStatus("Perekaman dimulai...");
  hideTrackControls();
  saveActiveTrackingSession();
  requestWakeLock(); // aman dipanggil meski tidak didukung (function sudah try/catch)

  // --- GPS watcher utama ---
  trackingWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy, speed } = pos.coords;

      // 1) Filter akurasi (abaikan titik tidak layak)
      if (accuracy != null && accuracy > ACCURACY_THRESHOLD_M) {
        updateTrackingStatus(`Akurasi buruk (${Math.round(accuracy)} m) – titik diabaikan`);
        // Saat kompas aktif, tetap kunci pusat agar poros tidak bergeser
        if (mapRotateMode === 'compass') keepUserCenteredCompass();
        return;
      }

      // 2) Update posisi user terakhir (untuk pusat poros kompas)
      lastUserLatLng = [latitude, longitude];

      // 3) Hitung kecepatan (prioritaskan sensor native; fallback dari dua titik)
      const now = { lat: latitude, lng: longitude, t: Date.now() };
      let vMps = (typeof speed === 'number' && !isNaN(speed)) ? speed : 0;
      if (!vMps || vMps <= 0) {
        if (lastSpeedRef) vMps = computeSpeedMps(lastSpeedRef, now);
      }

      // 4) Auto-pause / Auto-resume
      if (vMps < SPEED_PAUSE_THRESH_MPS) {
        if (lastSpeedRef) idleAccumMs += (now.t - lastSpeedRef.t);
        if (!trackingAutoPaused && idleAccumMs >= IDLE_PAUSE_SECS * 1000) {
          trackingAutoPaused = true;
          updateTrackingStatus("Tracking Auto-Pause (diam terlalu lama). Bergerak untuk melanjutkan...");
        }
      } else {
        idleAccumMs = 0;
        if (trackingAutoPaused && vMps >= RESUME_SPEED_MPS) {
          trackingAutoPaused = false;
          updateTrackingStatus("Gerak terdeteksi, tracking dilanjutkan.");
        }
      }
      lastSpeedRef = now;

      // Saat auto-pause: jangan menambah titik tapi tetap jaga poros kompas
      if (trackingAutoPaused) {
        if (mapRotateMode === 'compass') keepUserCenteredCompass();
        return;
      }

      // 5) Tambahkan titik, render polyline, dan posisikan marker
      trackingData.push({ timestamp: now.t, latitude, longitude, accuracy });
      updateGeoMapTracking(trackingData);
      userMarker.setLatLng(lastUserLatLng);

      // 6) Pusatkan tampilan:
      //    - Mode kompas: paksa user tepat di tengah (pivot rotasi)
      //    - Mode biasa: pan jika di luar bounds
      if (mapRotateMode === 'compass') {
        keepUserCenteredCompass();
      } else if (!map.getBounds().contains(lastUserLatLng)) {
        map.panTo(lastUserLatLng);
      }

      // 7) Status + autosave
      updateTrackingStatus(
        `Tracking: ${trackingData.length} titik. Lokasi: (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
      );
      saveActiveTrackingSession();
    },
    (err) => {
      updateTrackingStatus("Gagal ambil lokasi: " + err.message);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

function pauseTracking(manual=true) {
  if (!trackingActive || trackingPaused) return;
  trackingPaused = true;
  trackingAutoPaused = false;

  if (manual) {
    // Pause manual: hentikan watcher
    if (trackingWatchId !== null) {
      navigator.geolocation.clearWatch(trackingWatchId);
      trackingWatchId = null;
    }
  }
  trackingPauseTime = Date.now();
  document.getElementById("btnTrackStart").disabled = false;
  document.getElementById("btnTrackPause").disabled = true;
  document.getElementById("btnTrackStop").disabled  = false;
  updateTrackingStatus(manual ? "Tracking dijeda (pause)." : "Tracking auto-pause.");
}

function stopTracking() {
  if (!trackingActive) return;
  trackingActive = false;
  trackingPaused = false;
  trackingAutoPaused = false;
  if (trackingWatchId !== null) {
    navigator.geolocation.clearWatch(trackingWatchId);
    trackingWatchId = null;
  }
  releaseWakeLock();
  document.getElementById("btnTrackStart").disabled = false;
  document.getElementById("btnTrackPause").disabled = true;
  document.getElementById("btnTrackStop").disabled  = true;

  if (trackingData.length > 1) {
    // Simplifikasi jalur sebelum simpan
    const simplified = simplifyPath(trackingData, SIMPLIFY_TOLERANCE_M);

    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    let namaBlok = getCurrentBlokLabel();
    history.push({
      id: Date.now(),
      date: new Date(trackingStartTime).toLocaleString(),
      duration: trackingPauseTime ? (trackingPauseTime - trackingStartTime) : (Date.now() - trackingStartTime),
      points: simplified,
      blok: namaBlok,
      color: trackingColor
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    updateTrackingStatus(`Tracking disimpan (${simplified.length} titik setelah simplify ${SIMPLIFY_TOLERANCE_M} m)`);
  } else {
    updateTrackingStatus("Tidak ada data tracking disimpan.");
  }

  // Hapus sesi aktif & reset polyline aktif
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  updateGeoMapTracking([]);
  trackingData = [];
  trackingStartTime = null;
  trackingPauseTime = null;
  lastSpeedRef = null; idleAccumMs = 0;

  renderTrackingHistoryTable();
  renderTrackingHistoryOnMap();

  showTrackControls();
}

function updateTrackingStatus(msg) {
  document.getElementById("tracking-status").textContent = msg;
}

// ================== POLYLINE TRACKING ==================
function updateGeoMapTracking(dataArr) {
  if (!map || !trackingPolyline) return;
  if (!dataArr || dataArr.length === 0) {
    trackingPolyline.setLatLngs([]);
    return;
  }
  const latlngs = dataArr.map(pt => [pt.latitude, pt.longitude]);
  trackingPolyline.setStyle({ color: trackingColor });
  trackingPolyline.setLatLngs(latlngs);
  let last = latlngs[latlngs.length - 1];
  if (last) userMarker.setLatLng(last);
}

// ================== Utility warna icon placemark (tetap) ==================
function colorToHex(color) {
  if (color === 'red') return '#ff0000';
  if (color === 'blue') return '#007bff';
  if (color === 'green') return '#28a745';
  if (color === 'orange') return '#ffa500';
  if (color === 'purple') return '#800080';
  return color;
}
function createColoredPlacemarkSVG(color = '#ff0000') {
  return `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" 
         xmlns="http://www.w3.org/2000/svg">
      <g>
        <ellipse cx="16" cy="11" rx="7" ry="7" fill="${color}"/>
        <path d="M16 30C16 30 5 20.3628 5 12.5C5 6.70101 10.4772 2 16 2C21.5228 2 27 6.70101 27 12.5C27 20.3628 16 30 16 30Z" fill="${color}" stroke="#666" stroke-width="2"/>
        <circle cx="16" cy="13" r="3" fill="#fff" stroke="#888" stroke-width="1"/>
      </g>
    </svg>
  `;
}
function createColoredPlacemarkIcon(color) {
  let svg = createColoredPlacemarkSVG(colorToHex(color));
  let url = "data:image/svg+xml;base64," + btoa(svg);
  return L.icon({ iconUrl: url, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28] });
}

// ================== PLACEMARK HANDLING (tetap) ==================
function addPlacemark(latlng, note, color = 'red') {
  placemarks.push({ lat: latlng.lat, lng: latlng.lng, note: note, color: color });
  localStorage.setItem("geoPlacemarks", JSON.stringify(placemarks));
  let icon = createColoredPlacemarkIcon(colorToHex(color));
  if (placemarksLayer) {
    let marker = L.marker([latlng.lat, latlng.lng], { icon: icon }).addTo(placemarksLayer);
    if (note) marker.bindPopup(note).openPopup();
  }
  renderPlacemarkTable();
}
function restorePlacemarks() {
  if (!placemarksLayer) return;
  placemarksLayer.clearLayers();
  placemarks.forEach((pm) => {
    let icon = createColoredPlacemarkIcon(colorToHex(pm.color || 'red'));
    let marker = L.marker([pm.lat, pm.lng], { icon: icon }).addTo(placemarksLayer);
    if (pm.note) marker.bindPopup(pm.note);
  });
}
function renderPlacemarkTable() {
  let tbody = document.getElementById('placemarkTable').querySelector('tbody');
  tbody.innerHTML = '';
  placemarks.forEach((p, i) => {
    let tr = tbody.insertRow();
    tr.insertCell(0).textContent = i + 1;
    tr.insertCell(1).textContent = (+p.lat).toFixed(6);
    tr.insertCell(2).textContent = (+p.lng).toFixed(6);
    tr.insertCell(3).textContent = p.note;
    // Color + visual
    let tdColor = tr.insertCell(4);
    let colorDiv = document.createElement('div');
    colorDiv.style.background = p.color;
    colorDiv.style.width = "30px";
    colorDiv.style.height = "20px";
    colorDiv.style.display = "inline-block";
    colorDiv.style.border = "1px solid #888";
    colorDiv.title = p.color;
    tdColor.appendChild(colorDiv);
    // Hapus
    let delBtn = document.createElement('button');
    delBtn.textContent = "Hapus";
    delBtn.style.backgroundColor = "#dc3545";
    delBtn.style.color = "white";
    delBtn.onclick = function () {
      placemarks.splice(i, 1);
      localStorage.setItem("geoPlacemarks", JSON.stringify(placemarks));
      restorePlacemarks();
      renderPlacemarkTable();
    };
    let td5 = tr.insertCell(5);
    td5.appendChild(delBtn);
  });
}

// ================== Export Placemark KML (tetap) ==================
document.getElementById('exportPlacemarkKML').onclick = function () {
  if (!placemarks.length) return alert("Tidak ada placemark.");
  let kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Placemarks TO</name>`;
  placemarks.forEach((p, i) => {
    kml += `<Placemark><name>${p.note||'Placemark '+(i+1)}</name>
      <Style><IconStyle><color>${colorToKMLHex(p.color)}</color></IconStyle></Style>
      <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
    </Placemark>`;
  });
  kml += `</Document></kml>`;
  let blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `placemark_TO_${(new Date()).toISOString().replace(/\W/g,'').slice(0,12)}.kml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
function colorToKMLHex(c) {
  const map = {
    red:    "ff0000ff",
    blue:   "ffff0000",
    green:  "ff00ff00",
    orange: "ff00a5ff",
    purple: "ffff00ff"
  };
  if (/^#([0-9a-f]{6})$/i.test(c)) {
    const rr = c.slice(1,3), gg = c.slice(3,5), bb = c.slice(5,7);
    return "ff" + bb + gg + rr;
  }
  return map[c] || "ff0000ff";
}

// ================== TOMBOL TAMBAH PLACEMARK ==================
let lastPlacemarkColor = 'red';
function showPlacemarkPrompt(latlng) {
  let html = `<label>Keterangan: <input id="pmNote" type="text" style="width:140px"></label><br>
        <label>Warna: <select id="pmColor">
            <option value="red">Merah</option>
            <option value="blue">Biru</option>
            <option value="green">Hijau</option>
            <option value="orange">Oranye</option>
            <option value="purple">Ungu</option>
        </select></label>
        <br><button id="pmOkBtn">OK</button>`;
  let popup = L.popup().setLatLng(latlng).setContent(html).openOn(map);
  setTimeout(() => {
    document.getElementById('pmColor').value = lastPlacemarkColor;
    document.getElementById('pmOkBtn').onclick = function () {
      let note = document.getElementById('pmNote').value.trim();
      let color = document.getElementById('pmColor').value;
      lastPlacemarkColor = color;
      addPlacemark(latlng, note, color);
      map.closePopup(popup);
    };
  }, 200);
}

// ================== DOM Ready ==================
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    initGeoMap();
    restorePlacemarks();
    renderPlacemarkTable();
  }, 400);

  // State tombol awal
  document.getElementById("btnTrackStart").disabled = false;
  document.getElementById("btnTrackPause").disabled = true;
  document.getElementById("btnTrackStop").disabled = true;

  loadPersistedNWSE();
  renderTrackingHistoryTable();
  renderTrackingHistoryOnMap();
});
document.getElementById('btnAddPlacemarkMap').onclick = function () {
  let center = map.getCenter();
  showPlacemarkPrompt(center);
};

// ================== HISTORY TRACKING (tambah GPX, GeoJSON, PDF) ==================
function renderTrackingHistoryTable() {
  const table = document.getElementById("tracking-history-table").getElementsByTagName("tbody")[0];
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  table.innerHTML = "";
  if (history.length === 0) {
    const row = table.insertRow();
    let cell = row.insertCell(0);
    cell.colSpan = 6;
    cell.textContent = "Belum ada data tracking.";
    return;
  }
  history.slice().reverse().forEach((item) => {
    let row = table.insertRow();
    row.insertCell(0).textContent = item.date;
    row.insertCell(1).textContent = item.blok || "-";
    row.insertCell(2).textContent = msToTime(item.duration);
    row.insertCell(3).textContent = item.points.length;

    const stats = computeSessionStats(item.points);
    const tdStats = row.insertCell(4);
    tdStats.textContent = `${(stats.distanceKm).toFixed(2)} km`;

    let cellAksi = row.insertCell(5);
    cellAksi.innerHTML = `
      <button class="export-btn small-btn" style="background-color: #28a745; color: white;" onclick="exportTrackingKML(${item.id})">KML</button>
      <button class="export-btn small-btn" style="background-color: #20c997; color: white;" onclick="exportTrackingGPX(${item.id})">GPX</button>
      <button class="export-btn small-btn" style="background-color: #6f42c1; color: white;" onclick="exportTrackingGeoJSON(${item.id})">GeoJSON</button>
      <button class="export-btn small-btn" style="background-color: #343a40; color: white;" onclick="exportTrackingPDF(${item.id})" title="PDF + snapshot">PDF</button>
      <button class="delete-btn small-btn" style="background-color: #dc3545; color: white;" onclick="deleteTrackingHistory(${item.id})">Hapus</button>
      <button class="show-map-btn small-btn" style="background-color: #007bff; color: white;" onclick="showTrackingOnMap(${item.id})" title="Jarak ${(stats.distanceKm).toFixed(2)} km, Vavg ${(stats.speedAvgKmh).toFixed(1)} km/j">Peta</button>
    `;
  });
}

function showTrackingOnMap(id) {
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  let item = history.find(h => h.id === id);
  if (!item || !item.points || item.points.length < 1) {
    alert("Data tracking tidak valid!");
    return;
  }
  updateGeoMapTracking(item.points);
  const latlngs = item.points.map(pt => [pt.latitude, pt.longitude]);
  if (latlngs.length >= 2) {
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [20,20] });
  } else {
    let last = item.points[item.points.length - 1];
    map.setView([last.latitude, last.longitude], map.getZoom());
  }
}

// ================== Ekspor format tambahan ==================
function exportTrackingGPX(id){
  const item = (JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]")).find(h=>h.id===id);
  if (!item || !item.points?.length) return alert('Data kosong');
  const trkseg = item.points.map(pt => 
    `<trkpt lat="${pt.latitude}" lon="${pt.longitude}"><time>${new Date(pt.timestamp).toISOString()}</time></trkpt>`
  ).join('\n');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TO-App" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${item.blok||'-'}</name><trkseg>
${trkseg}
  </trkseg></trk>
</gpx>`;
  downloadText(gpx, `TrackingTO_${id}.gpx`, 'application/gpx+xml');
}
function exportTrackingGeoJSON(id){
  const item = (JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]")).find(h=>h.id===id);
  if (!item || !item.points?.length) return alert('Data kosong');
  const coords = item.points.map(pt => [pt.longitude, pt.latitude]);
  const gj = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { id:item.id, date:item.date, blok:item.blok, color:item.color||'#888' },
      geometry: { type: "LineString", coordinates: coords }
    }]
  };
  downloadText(JSON.stringify(gj), `TrackingTO_${id}.geojson`, 'application/geo+json');
}
function downloadText(text, filename, mime){
  const blob = new Blob([text], {type:mime});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ================== Statistik + Snapshot + PDF ==================
function computeSessionStats(points){
  if (!points || points.length<2) return {distanceKm:0, speedAvgKmh:0, speedMaxKmh:0};
  let dist=0, vmax=0;
  for(let i=1;i<points.length;i++){
    const A={lat:points[i-1].latitude, lng:points[i-1].longitude, t:points[i-1].timestamp};
    const B={lat:points[i].latitude,   lng:points[i].longitude,   t:points[i].timestamp};
    dist += haversineMeters(A,B);
    const v = computeSpeedMps(A,B)*3.6;
    if (v>vmax) vmax=v;
  }
  const durationSec = (points[points.length-1].timestamp - points[0].timestamp)/1000;
  const vavg = durationSec>0 ? (dist/1000)/(durationSec/3600) : 0;
  return {distanceKm: dist/1000, speedAvgKmh: vavg, speedMaxKmh: vmax};
}

function exportTrackingPDF(id){
  const item = (JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]")).find(h=>h.id===id);
  if (!item || !item.points?.length) return alert('Data kosong');

  const stats = computeSessionStats(item.points);
  const canvas = routeCanvasSnapshot(item.points, 800, 500, item.color||'#333');
  const imgData = canvas.toDataURL('image/png');

  if (window.jspdf || window.jsPDF){
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({orientation:'l', unit:'pt', format:'a4'});
    doc.setFontSize(16);
    doc.text('Laporan Tracing TO', 40, 40);
    doc.setFontSize(11);
    doc.text(`Tanggal : ${item.date}`, 40, 64);
    doc.text(`Blok    : ${item.blok||'-'}`, 40, 80);
    doc.text(`Panjang : ${stats.distanceKm.toFixed(2)} km`, 40, 96);
    doc.text(`Durasi  : ${msToTime(item.duration)}`, 40, 112);
    doc.text(`V rata2 : ${stats.speedAvgKmh.toFixed(1)} km/j`, 40, 128);
    doc.text(`V maks  : ${stats.speedMaxKmh.toFixed(1)} km/j`, 40, 144);
    // Gambar snapshot
    const pageW = doc.internal.pageSize.getWidth();
    doc.addImage(imgData, 'PNG', 40, 170, pageW-80, (pageW-80)*500/800);
    doc.save(`Laporan_TrackingTO_${id}.pdf`);
  } else {
    // Fallback: unduh PNG snapshot saja
    const a = document.createElement('a');
    a.href = imgData;
    a.download = `Snapshot_TrackingTO_${id}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    alert('jsPDF tidak ditemukan. Mengunduh snapshot PNG sebagai pengganti.');
  }
}

// Gambar snapshot jalur pada canvas (tanpa tile, aman offline)
function routeCanvasSnapshot(points, width, height, color){
  const cvs = document.createElement('canvas');
  cvs.width = width; cvs.height = height;
  const ctx = cvs.getContext('2d');
  // Background
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,width,height);
  // Bounds
  const lats = points.map(p=>p.latitude), lngs = points.map(p=>p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 20;
  function proj(p){
    const x = pad + ( (p.longitude - minLng) / (maxLng - minLng || 1) ) * (width - 2*pad);
    const y = pad + ( (maxLat - p.latitude) / (maxLat - minLat || 1) ) * (height - 2*pad);
    return {x,y};
  }
  // Axis border
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  ctx.strokeRect(10,10,width-20,height-20);
  // Path
  ctx.strokeStyle = color || '#333'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap='round';
  ctx.beginPath();
  points.forEach((p,i)=>{
    const {x,y} = proj(p);
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
  // Start/End dots
  const s = proj(points[0]); const e = proj(points[points.length-1]);
  ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(s.x,s.y,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(e.x,e.y,5,0,Math.PI*2); ctx.fill();
  return cvs;
}

// ================== OFFLINE MAP (tetap + persist NW/SE) ==================
document.getElementById('btnSetOfflineMap').onclick = function () {
  const fileInput = document.getElementById('offlineMapInput');
  if (!fileInput.files.length) {
    alert('Pilih file gambar atau PDF terlebih dahulu!');
    return;
  }
  const inw = document.getElementById('offlineMapNW');
  const ise = document.getElementById('offlineMapSE');
  if (inw) localStorage.setItem(NW_KEY, inw.value);
  if (ise) localStorage.setItem(SE_KEY, ise.value);

  let img = fileInput.files[0];
  let reader = new FileReader();
  reader.onload = function (e) {
    if (img.type === "application/pdf") {
      extractGeoReferenceFromPDF(e.target.result).then(geoRef => {
        if (geoRef && geoRef.bounds) {
          document.getElementById('offlineMapNW').disabled = true;
          document.getElementById('offlineMapSE').disabled = true;
          let minX = geoRef.bounds[0];
          let minY = geoRef.bounds[1];
          let maxX = geoRef.bounds[2];
          let maxY = geoRef.bounds[3];
          let nw = [maxY, minX];
          let se = [minY, maxX];
          updateTrackingStatus("GeoPDF terdeteksi, georeference otomatis diterapkan.");
          renderPDFasOverlay(e.target.result, nw, se);
        } else {
          document.getElementById('offlineMapNW').disabled = false;
          document.getElementById('offlineMapSE').disabled = false;
          updateTrackingStatus("GeoPDF tidak ditemukan, silakan input manual.");
          let nw = document.getElementById('offlineMapNW').value.split(',').map(x => parseFloat(x.trim()));
          let se = document.getElementById('offlineMapSE').value.split(',').map(x => parseFloat(x.trim()));
          renderPDFasOverlay(e.target.result, nw, se);
        }
      });
    } else {
      let nw = document.getElementById('offlineMapNW').value.split(',').map(x => parseFloat(x.trim()));
      let se = document.getElementById('offlineMapSE').value.split(',').map(x => parseFloat(x.trim()));
      if (nw.length !== 2 || se.length !== 2 || isNaN(nw[0]) || isNaN(se[0])) {
        alert('LatLng belum valid!');
        return;
      }
      if (offlineImageLayer) map.removeLayer(offlineImageLayer);
      offlineImageLayer = L.imageOverlay(e.target.result, [[nw[0], nw[1]], [se[0], se[1]]]).addTo(map);
      map.fitBounds([[nw[0], nw[1]],[se[0], se[1]]]);
    }
  };
  if (img.type === "application/pdf") reader.readAsArrayBuffer(img);
  else reader.readAsDataURL(img);
};
async function renderPDFasOverlay(pdfArrayBuffer, nw, se) {
  try {
    const loadingTask = window.pdfjsLib.getDocument({ data: pdfArrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1000 / page.view[2] });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    const imgDataUrl = canvas.toDataURL("image/png");
    if (offlineImageLayer) map.removeLayer(offlineImageLayer);
    offlineImageLayer = L.imageOverlay(imgDataUrl, [[nw[0], nw[1]], [se[0], se[1]]]).addTo(map);
    map.fitBounds([[nw[0], nw[1]],[se[0], se[1]]]);
  } catch (err) {
    alert("Gagal memuat PDF: " + err);
    console.error(err);
  }
}
async function extractGeoReferenceFromPDF(arrayBuffer) {
  if (!window.pdfjsLib) {
    alert("PDF.js belum dimuat!");
    return null;
  }
  try {
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const annots = await page.getAnnotations();
    for (let annot of annots) {
      if (annot && annot.measure && annot.measure.bounds) {
        return { bounds: annot.measure.bounds, crs: annot.measure.gcs };
      }
    }
    return null;
  } catch (err) {
    console.error("Error parsing PDF for georeference:", err);
    return null;
  }
}
document.getElementById('btnRemoveOfflineMap').onclick = function () {
  if (offlineImageLayer) map.removeLayer(offlineImageLayer);
  offlineImageLayer = null;
  document.getElementById('offlineMapNW').disabled = false;
  document.getElementById('offlineMapSE').disabled = false;
};

// ================== Utility umum ==================
function exportTrackingKML(id) {
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  let item = history.find(h => h.id === id);
  if (!item || !item.points || item.points.length < 2) {
    alert("Data tracking tidak valid!");
    return;
  }
  function pad2(n){ return n.toString().padStart(2, "0"); }
  let firstTimestamp = item.points[0].timestamp;
  let dt = new Date(firstTimestamp);
  let YY = pad2(dt.getFullYear() % 100);
  let MM = pad2(dt.getMonth() + 1);
  let DD = pad2(dt.getDate());
  let HH = pad2(dt.getHours());
  let mm = pad2(dt.getMinutes());
  let ss = pad2(dt.getSeconds());
  let namaBlok = (item.blok || "-").replace(/[^a-zA-Z0-9\-]/g, "");
  let fileName = `${YY}${MM}${DD}${HH}${mm}${ss}_TrackingTO_${namaBlok}.kml`;
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>Tracking Sensus ${item.date} [${namaBlok}]</name>
<Placemark>
  <name>Rute Sensus (${namaBlok})</name>
  <LineString>
    <tessellate>1</tessellate>
    <coordinates>
      ${item.points.map(pt => `${pt.longitude},${pt.latitude},0`).join("\n      ")}
    </coordinates>
  </LineString>
</Placemark>
</Document>
</kml>`;
  let blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function deleteTrackingHistory(id) {
  if (!confirm("Hapus history tracking ini?")) return;
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history = history.filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderTrackingHistoryTable();
  renderTrackingHistoryOnMap();
  updateGeoMapTracking([]);
}
function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours   = Math.floor((duration / (1000 * 60 * 60)));
  return `${hours > 0 ? hours + "j " : ""}${minutes}m ${seconds}s`;
}

// ====== UI helper sebelumnya (warna, NW/SE, pull-to-refresh blocker) ======
function setupTrackColorPicker(){
  const btnStart = document.getElementById("btnTrackStart");
  let host = btnStart?.parentElement || document.getElementById("tracking-section") || document.getElementById("tracking-status")?.parentElement;
  if (!host) return;
  if (!document.getElementById("trackColorPicker")){
    const wrap = document.createElement("div");
    wrap.id = "trackColorWrap";
    wrap.style.margin = "8px 0";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "8px";
    const label = document.createElement("label");
    label.textContent = "Warna Tracking:";
    const input = document.createElement("input");
    input.type = "color";
    input.id = "trackColorPicker";
    input.value = trackingColor;
    input.style.width = "42px";
    input.style.height = "32px";
    input.style.border = "none";
    input.addEventListener("input", ()=>{
      trackingColor = input.value;
      localStorage.setItem(TRACK_COLOR_KEY, trackingColor);
      if (trackingPolyline) trackingPolyline.setStyle({color: trackingColor});
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (raw) {
        try { const s = JSON.parse(raw); s.color = trackingColor; localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(s)); } catch {}
      }
    });
    wrap.appendChild(label); wrap.appendChild(input); host.appendChild(wrap);
  } else {
    document.getElementById("trackColorPicker").value = trackingColor;
  }
}
function hideTrackControls(){
  const start = document.getElementById("btnTrackStart");
  const pause = document.getElementById("btnTrackPause");
  const stop  = document.getElementById("btnTrackStop");
  if (start) start.style.display = "none";
  if (pause) pause.style.display = "none";
  if (stop)  stop.style.display  = "none";
  let toggle = document.getElementById("trackControlsToggle");
  if (!toggle) {
    toggle = document.createElement("div");
    toggle.id = "trackControlsToggle";
    toggle.textContent = "Tampilkan kontrol tracking";
    toggle.style.cssText = "margin:6px 0; text-decoration:underline; cursor:pointer; color:#007bff; font-size:14px;";
    const status = document.getElementById("tracking-status");
    const host = status?.parentElement || start?.parentElement || document.body;
    host.appendChild(toggle);
    toggle.addEventListener("click", showTrackControls);
  } else {
    toggle.style.display = "block";
  }
}
function showTrackControls(){
  const start = document.getElementById("btnTrackStart");
  const pause = document.getElementById("btnTrackPause");
  const stop  = document.getElementById("btnTrackStop");
  if (start) start.style.display = "";
  if (pause) pause.style.display = "";
  if (stop)  stop.style.display  = "";
  const toggle = document.getElementById("trackControlsToggle");
  if (toggle) toggle.style.display = "none";
}
function loadPersistedNWSE(){
  const inw = document.getElementById("offlineMapNW");
  const ise = document.getElementById("offlineMapSE");
  const nw = localStorage.getItem(NW_KEY);
  const se = localStorage.getItem(SE_KEY);
  if (inw && nw) inw.value = nw;
  if (ise && se) ise.value = se;
  if (inw) inw.addEventListener("change", ()=> localStorage.setItem(NW_KEY, inw.value));
  if (ise) ise.addEventListener("change", ()=> localStorage.setItem(SE_KEY, ise.value));
}
function setupPullToRefreshBlocker(){
  try{
    document.documentElement.style.overscrollBehaviorY = "contain";
    document.body.style.overscrollBehaviorY = "contain";
  }catch{}
  let lastY = 0;
  window.addEventListener("touchstart", (e)=>{
    if (e.touches.length !== 1) return;
    lastY = e.touches[0].clientY;
  }, {passive:false});
  window.addEventListener("touchmove", (e)=>{
    if (e.touches.length !== 1) return;
    if (e.target && typeof e.target.closest === "function" && e.target.closest("#geo-map")) return;
    const el = document.scrollingElement || document.documentElement;
    const currentY = e.touches[0].clientY;
    const pullingDown = currentY > lastY;
    if (el.scrollTop === 0 && pullingDown) e.preventDefault();
    lastY = currentY;
  }, {passive:false});
}

// ================== Tab integration (tetap + minor) ==================
const originalOpenTab2 = openTab;
openTab = function (evt, tabName) {
  originalOpenTab2(evt, tabName);
  if (tabName === "setting") {
    renderTrackingHistoryTable();
    renderPlacemarkTable();
  }
  if (tabName === "identifikasi") {
    setTimeout(() => {
      initGeoMap();
      restorePlacemarks();
      renderPlacemarkTable();
      updateGeoMapTracking(trackingData);
      renderTrackingHistoryOnMap();
      startUserLocationWatcher();
    }, 300);
  }
};

// ================== Cleanup watcher saat keluar (tetap) ==================
window.addEventListener("beforeunload", function () {
  if (userLocationWatchId !== null) navigator.geolocation.clearWatch(userLocationWatchId);
  if (trackingWatchId      !== null) navigator.geolocation.clearWatch(trackingWatchId);
  releaseWakeLock();
});
