
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    setDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCB-LoQW9wthVIf-5oUDt6VWWCvZsnNpKk",
    authDomain: "universities-74e90.firebaseapp.com",
    projectId: "universities-74e90",
    storageBucket: "universities-74e90.firebasestorage.app",
    messagingSenderId: "662966777687",
    appId: "1:662966777687:web:3f57bb5c5e888fa9c8f012"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const studentsCol = collection(db, "students");
const universitiesCol = collection(db, "universities");

// --- UI Elements ---
const addStudentForm = document.getElementById('addStudentForm');
const studentPhoneInput = document.getElementById('studentPhone');
const studentNameInput = document.getElementById('studentName');
const eduLevelSelect = document.getElementById('eduLevel');
const universityCheckboxesContainer = document.getElementById('universityCheckboxes');
const selectedCountText = document.getElementById('selectedCountText');
const multiSelectBtn = document.getElementById('multiSelectBtn');
const languageLevelSelect = document.getElementById('languageLevel');
const languageDetailInput = document.getElementById('languageDetail');
const studentNotesInput = document.getElementById('studentNotes');
const studentsList = document.getElementById('studentsList');
const studentSearch = document.getElementById('studentSearch');
const levelFilter = document.getElementById('levelFilter');
const submitBtn = document.getElementById('submitBtn');
const studentDetailsModalEl = document.getElementById('studentDetailsModal');

studentDetailsModalEl.addEventListener('hide.bs.modal', () => {
    if (studentDetailsModalEl.contains(document.activeElement)) {
        document.activeElement.blur();
    }
});

let toastTimeout;
function showToast(message, type = 'info') {
    let toast = document.getElementById('iosToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'iosToast';
        toast.className = 'ios-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.remove('is-success', 'is-error', 'is-show');
    if (type === 'success') toast.classList.add('is-success');
    if (type === 'error') toast.classList.add('is-error');

    requestAnimationFrame(() => toast.classList.add('is-show'));
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('is-show');
    }, 2400);
}

// --- Level Mapping for Universities ---
const levelMapping = {
    'KOLLEJ': ['COLLEGE', 'REGIONAL (Telex)'],
    'BAKALAVR': ['BACHELOR', 'REGIONAL (Telex)', '1% TOP'],
    'MAGISTR': ['MASTER E-VISA'],
    'MAGISTR SERTIFIKATSIZ': ['MASTER NO CERTIFICATE'],
    'REGIONAL (TELEX)': ['REGIONAL (Telex)'],
    '1% TOP': ['1% TOP']
};

// --- Helper: Format Phone (XX-XXX-XX-XX) ---
studentPhoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 9) value = value.slice(0, 9);

    let formatted = '';
    if (value.length > 0) {
        formatted += value.substring(0, 2);
        if (value.length > 2) {
            formatted += '-' + value.substring(2, 5);
            if (value.length > 5) {
                formatted += '-' + value.substring(5, 7);
                if (value.length > 7) {
                    formatted += '-' + value.substring(7, 9);
                }
            }
        }
    }
    e.target.value = formatted;
});

// --- Helper: Force Uppercase Name ---
studentNameInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// --- Update Button Text for Multi-Select ---
function updateSelectedUnisCount() {
    const checked = document.querySelectorAll('.uni-checkbox:checked');
    if (checked.length === 0) {
        selectedCountText.textContent = "Choose Universities...";
    } else if (checked.length === 1) {
        selectedCountText.textContent = checked[0].value;
    } else {
        selectedCountText.textContent = `${checked.length} Universities Selected`;
    }
}

// --- Dynamic University Loading ---
eduLevelSelect.addEventListener('change', async (e) => {
    const selectedLevel = e.target.value;
    const targetLevels = levelMapping[selectedLevel] || [];

    universityCheckboxesContainer.innerHTML = '<div class="text-muted small">Loading universities...</div>';
    selectedCountText.textContent = "Loading...";

    try {
        if (targetLevels.length === 0) {
            universityCheckboxesContainer.innerHTML = '<div class="text-muted small">No levels mapped</div>';
            selectedCountText.textContent = "No levels mapped";
            return;
        }

        const q = query(universitiesCol, where("levels", "array-contains-any", targetLevels));
        const querySnapshot = await getDocs(q);

        universityCheckboxesContainer.innerHTML = '';

        if (querySnapshot.empty) {
            universityCheckboxesContainer.innerHTML = '<div class="text-muted small">No universities found</div>';
            selectedCountText.textContent = "No universities found";
        } else {
            querySnapshot.forEach((doc) => {
                const uni = doc.data();
                const name = uni.name || doc.id;
                const div = document.createElement('div');
                div.className = 'form-check custom-check mb-2';
                div.style.paddingLeft = '30px';
                div.innerHTML = `
                    <input class="form-check-input uni-checkbox" type="checkbox" value="${name}" id="uni_${doc.id}">
                    <label class="form-check-label small fw-medium text-dark" for="uni_${doc.id}" style="cursor:pointer;">
                        ${name}
                    </label>
                `;
                universityCheckboxesContainer.appendChild(div);
            });

            // Add listeners to new checkboxes
            document.querySelectorAll('.uni-checkbox').forEach(cb => {
                cb.addEventListener('change', updateSelectedUnisCount);
            });

            selectedCountText.textContent = "Choose Universities...";
        }
    } catch (error) {
        console.error("Error loading universities:", error);
        universityCheckboxesContainer.innerHTML = '<div class="text-danger small">Error loading</div>';
        selectedCountText.textContent = "Error loading";
    }
});

// --- Submit Form ---
addStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = studentNameInput.value.trim();
    const phone = studentPhoneInput.value;
    const eduLevel = eduLevelSelect.value;

    const selectedUnis = Array.from(document.querySelectorAll('.uni-checkbox:checked')).map(cb => cb.value);
    const langLevel = languageLevelSelect.value;
    const langDetail = languageDetailInput.value.trim();
    const notes = studentNotesInput.value.trim();

    const fatherOptions = Array.from(document.querySelectorAll('#fatherConditions input:checked')).map(cb => cb.value);
    const motherOptions = Array.from(document.querySelectorAll('#motherConditions input:checked')).map(cb => cb.value);

    if (!name || !phone || !eduLevel || selectedUnis.length === 0 || !langLevel) {
        showToast("Please fill all required fields!", "error");
        return;
    }

    const studentData = {
        name: name,
        phone: phone,
        educationLevel: eduLevel,
        universities: selectedUnis,
        language: langDetail ? `${langLevel} (${langDetail})` : langLevel,
        family: {
            father: fatherOptions,
            mother: motherOptions
        },
        notes: notes,
        createdAt: new Date().toISOString(),
        manager: "Korean Consulting Manager"
    };

    try {
        submitBtn.disabled = true;
        submitBtn.querySelector('.spinner-border').classList.remove('d-none');

        await setDoc(doc(db, "students", name), studentData);

        bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
        addStudentForm.reset();
        universityCheckboxesContainer.innerHTML = '<div class="text-muted small">First select level...</div>';
        selectedCountText.textContent = "First select level...";
        showToast("Student data saved successfully!", "success");

    } catch (error) {
        console.error("Error adding document: ", error);
        showToast("Error saving data: " + error.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.spinner-border').classList.add('d-none');
    }
});

// --- Details Modal Logic ---
let currentSnapshotStudents = [];

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function openStudentDetails(studentId) {
    const student = currentSnapshotStudents.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('detailStudentName').textContent = student.name;
    document.getElementById('detailPhone').textContent = student.phone;

    const badge = document.getElementById('detailLevelBadge');
    badge.textContent = student.educationLevel;
    badge.className = `badge rounded-3 px-3 py-2 fw-bold level-${getLevelClass(student.educationLevel)}`;

    const uniContainer = document.getElementById('detailUniversities');
    uniContainer.innerHTML = (student.universities || []).map(u => `
        <span class="badge bg-white text-dark border fw-medium px-2 py-1">${escapeHtml(u)}</span>
    `).join('') || '<div class="text-muted small">N/A</div>';

    document.getElementById('detailLanguage').textContent = student.language || 'N/A';
    document.getElementById('detailNotes').textContent = student.notes || 'No extra notes provided.';

    // Family Info
    const familyContainer = document.getElementById('detailFamilyInfo');
    familyContainer.innerHTML = `
        <div class="col-6">
            <div class="p-2 rounded-3 bg-light border h-100">
                <label class="text-muted small fw-bold text-uppercase mb-1 d-block" style="font-size: 0.65rem;">Father</label>
                ${(student.family?.father || []).map(f => `<div class="small fw-medium" style="font-size: 0.75rem;">- ${escapeHtml(f)}</div>`).join('') || '<div class="text-muted small" style="font-size: 0.75rem;">No Info</div>'}
            </div>
        </div>
        <div class="col-6">
            <div class="p-2 rounded-3 bg-light border h-100">
                <label class="text-muted small fw-bold text-uppercase mb-1 d-block" style="font-size: 0.65rem;">Mother</label>
                ${(student.family?.mother || []).map(m => `<div class="small fw-medium" style="font-size: 0.75rem;">- ${escapeHtml(m)}</div>`).join('') || '<div class="text-muted small" style="font-size: 0.75rem;">No Info</div>'}
            </div>
        </div>
    `;

    // Show Modal
    const modalEl = studentDetailsModalEl;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    // Share Button Logic
    const shareBtn = document.getElementById('shareBtn');
    shareBtn.onclick = async () => {
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Copying...';
        shareBtn.disabled = true;

        let footer;
        try {
            const modalContent = modalEl.querySelector('.modal-content');

            // Wait for images/styles to render perfectly
            await new Promise(resolve => setTimeout(resolve, 800));

            footer = modalContent.querySelector('.modal-footer');
            if (footer) {
                footer.style.display = 'none';
            }

            // Use html2canvas to avoid cross-origin cssRules parsing issues from html-to-image
            const canvas = await window.html2canvas(modalContent, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });

            let blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });

            if (!blob) {
                const dataUrl = canvas.toDataURL('image/png');
                blob = await (await fetch(dataUrl)).blob();
            }

            if (!blob) {
                throw new Error('Image conversion failed');
            }

            if (window.ClipboardItem && navigator.clipboard?.write) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showToast('Card copied. Paste it in Telegram.', 'success');
            } else {
                downloadImage(blob, student.name);
                showToast('Clipboard copy unsupported. Downloaded instead.', 'info');
            }

            resetButton();

        } catch (error) {
            console.error('Error generating image:', error);
            showToast('Could not generate image. Please try again.', 'error');
            resetButton();
        } finally {
            if (footer) {
                footer.style.display = '';
            }
        }

        function resetButton() {
            shareBtn.innerHTML = originalText;
            shareBtn.disabled = false;
        }

        function downloadImage(blob, name) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}_Card.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Suggestion Board Logic (Async Check)
    const suggestionBox = document.getElementById('detailSuggestion');
    const suggestionContainer = suggestionBox.parentElement;

    // Set loading state
    suggestionBox.textContent = "Checking university status...";
    suggestionBox.className = "text-muted small italic";
    suggestionContainer.className = "h-100 p-2 rounded-3 bg-light border";

    (async () => {
        let isTop1Percent = false;
        let hasCollegeWithoutRegional = false;
        const suggestions = [];
        const father = Array.isArray(student.family?.father) ? student.family.father : [];
        const mother = Array.isArray(student.family?.mother) ? student.family.mother : [];
        const allFamily = [...father, ...mother].map(v => String(v || '').toUpperCase());
        const language = String(student.language || '').toUpperCase();

        const hasFamilyCondition = (condition) => allFamily.includes(condition);
        const fatherAbroad = father.map(v => String(v || '').toUpperCase()).includes('CHET ELDA ISHLAYDI');
        const motherAbroad = mother.map(v => String(v || '').toUpperCase()).includes('CHET ELDA ISHLAYDI');

        // Existing 1% TOP rule
        if (student.educationLevel && student.educationLevel.toUpperCase().includes('1% TOP')) {
            isTop1Percent = true;
        }

        if (!isTop1Percent && student.universities && student.universities.length > 0) {
            try {
                const unisCopy = [...student.universities];
                while (unisCopy.length > 0) {
                    const batch = unisCopy.splice(0, 10);
                    const q = query(universitiesCol, where("name", "in", batch));
                    const snapshot = await getDocs(q);

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const levels = Array.isArray(data.levels) ? data.levels.map(l => String(l || '').toUpperCase()) : [];
                        if (data.levels && Array.isArray(data.levels) && data.levels.includes('1% TOP')) {
                            isTop1Percent = true;
                        }
                        if (levels.includes('COLLEGE') && !levels.includes('REGIONAL (TELEX)')) {
                            hasCollegeWithoutRegional = true;
                        }
                    });

                    if (isTop1Percent) break;
                }
            } catch (error) {
                console.error("Error fetching university details:", error);
            }
        }

        if (isTop1Percent) {
            suggestions.push("1% lik Universitetlarga viza chiqishi 100%, Universitetga qabul qilinsangiz bo'ldi. Qabullar erta ochiladi, erta yopiladi, tezroq harakat qiling!");
        }

        const isBachelor = String(student.educationLevel || '').toUpperCase().includes('BAKALAVR');
        const isKollej = String(student.educationLevel || '').toUpperCase().includes('KOLLEJ');
        if (isBachelor && !isTop1Percent) {
            suggestions.push("USHBU UNIVERSITETGA OTA-ONA DAROMADI VA 31 KUNLIK KDB BANKSHOT MA'LUMOTNOMASI TALAB QILINADI!");
        }
        if (isKollej && hasCollegeWithoutRegional) {
            suggestions.push("USHBU UNIVERSITETGA OTA-ONA DAROMADI VA 31 KUNLIK KDB BANKSHOT MA'LUMOTNOMASI TALAB QILINADI!");
        }

        // Language expected rule
        if (language.includes('IELTS EXPECTED') || language.includes('TOPIK EXPECTED') || language.includes('SKA EXPECTED')) {
            suggestions.push("TEZROQ TIL SERTIFIKATI OLING!");
        }

        // Working abroad rule (father/mother based text)
        if (fatherAbroad || motherAbroad) {
            let parentText = "OTA YOKI ONANING";
            if (fatherAbroad && !motherAbroad) parentText = "OTANING";
            if (motherAbroad && !fatherAbroad) parentText = "ONANING";

            suggestions.push(
                `CHET ELDAGI DAROMADI TASDIQLOVCHI HUJJATLAR ZARUR. BULAR: ${parentText} BOSHQA DAVLATDA KIRDI CHIQDI QILGAN ZAGRANDAGI PECHAT SKANERI, ISH JOYIDAN MA'LUMOTNOMA, OXIRGI 12 OYDA OLGAN DAROMADI MA'LUMOTNOMASI, YUBORGAN PULLARI HAQIDA MA'LUMOTNOMA ZARUR! VIZAGA TOPSHIRGANDA KERAK BO'LADI`
            );
        }

        // Family condition rules
        if (hasFamilyCondition("NOMIDA UY BOR KADASTR YO'Q")) {
            suggestions.push("UYNI KADASTRDAN O'TKAZIB, KADASTRDAN KO'CHIRMA QILISH ZARUR. VIZAGA TOPSHIRGANDA KERAK BO'LADI");
        }

        if (hasFamilyCondition("TADBIRKOR")) {
            suggestions.push("TADBIRKORLIK GUVOHNOMASI\nBANK AYLANMASI VIZAGA TOPSHIRGANDA KERAK BO'LADI.");
        }

        if (hasFamilyCondition("AJRASHGAN")) {
            suggestions.push("AJRIM GUVOHNOMASI KERAK!");
        }

        if (hasFamilyCondition("VAFOT ETGAN")) {
            suggestions.push("VAFOT ETGANLIGI TO'G'RISIDA MA'LUMOTNOMA");
        }

        if (suggestions.length > 0) {
            suggestionBox.textContent = suggestions.join("\n\n");
            suggestionBox.style.whiteSpace = "pre-wrap";
            suggestionBox.className = "text-dark small fw-semibold";
            suggestionContainer.className = "h-100 p-2 rounded-3 bg-warning bg-opacity-10 border border-warning border-opacity-25";
        } else {
            suggestionBox.textContent = "Wait for manager's recommendation...";
            suggestionBox.style.whiteSpace = "";
            suggestionBox.className = "text-dark small";
            suggestionContainer.className = "h-100 p-2 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-10";
        }
    })();
}

// Window global for onclick access
window.openStudentDetails = openStudentDetails;

// --- Real-time List ---
function renderStudents() {
    const q = query(studentsCol, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        currentSnapshotStudents = [];
        snapshot.forEach((doc) => {
            currentSnapshotStudents.push({ id: doc.id, ...doc.data() });
        });
        updateStudentsView();
    });
}

function updateStudentsView() {
    const searchTerm = studentSearch.value.toLowerCase();
    const filterLevel = levelFilter.value;

    const filtered = currentSnapshotStudents.filter(s => {
        const nameMatch = s.name?.toLowerCase().includes(searchTerm);
        const phoneMatch = s.phone?.includes(searchTerm);
        const uniMatch = s.universities?.some(u => u.toLowerCase().includes(searchTerm));
        return (nameMatch || phoneMatch || uniMatch) && (filterLevel === "" || s.educationLevel === filterLevel);
    });

    displayFilteredStudents(filtered);
}

function displayFilteredStudents(students) {
    if (students.length === 0) {
        studentsList.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No students found.</p></div>`;
        return;
    }

    studentsList.innerHTML = students.map(s => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="student-card h-100" data-student-id="${s.id}" style="cursor:pointer;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="fw-bold mb-0 text-dark text-uppercase">${escapeHtml(s.name)}</h5>
                    <span class="level-badge level-${getLevelClass(s.educationLevel)}">${escapeHtml(s.educationLevel)}</span>
                </div>
                <div class="phone-badge mb-1"><i class="bi bi-phone me-1"></i> ${escapeHtml(s.phone)}</div>
                <div class="uni-ghost-text">
                    ${(s.universities || []).map(u => `<div class="mb-1"><i class="bi bi-bank2 me-1 small"></i>${escapeHtml(u)}</div>`).join('')}
                </div>
                <div class="mb-3">
                    <div class="text-muted small mb-1">Language:</div>
                    <div class="fw-bold text-dark small">${escapeHtml(s.language)}</div>
                </div>
                ${s.notes ? `<div class="p-2 rounded bg-light border-start border-4 border-warning small"><div class="text-muted fw-bold mb-1" style="font-size: 0.6rem;">NOTES</div>${escapeHtml(s.notes)}</div>` : ''}
            </div>
        </div>
    `).join('');

    studentsList.querySelectorAll('.student-card[data-student-id]').forEach((card) => {
        card.addEventListener('click', () => openStudentDetails(card.dataset.studentId));
    });
}

function getLevelClass(level) {
    if (!level) return 'kollej';
    const l = level.toUpperCase();
    if (l.includes('BAKALAVR')) return 'bakalavr';
    if (l.includes('MAGISTR')) return 'magistr';
    if (l.includes('KOLLEJ')) return 'kollej';
    if (l.includes('REGIONAL')) return 'telex';
    if (l.includes('1% TOP')) return 'top';
    return 'kollej';
}

renderStudents();
studentSearch.addEventListener('input', updateStudentsView);
levelFilter.addEventListener('change', updateStudentsView);
