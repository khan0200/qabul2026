
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
        alert("Please fill all required fields!");
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
        alert("Student data saved successfully!");

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Error saving data: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.spinner-border').classList.add('d-none');
    }
});

// --- Details Modal Logic ---
let currentSnapshotStudents = [];

async function openStudentDetails(studentName) {
    const student = currentSnapshotStudents.find(s => s.name === studentName);
    if (!student) return;

    document.getElementById('detailStudentName').textContent = student.name;
    document.getElementById('detailPhone').textContent = student.phone;

    const badge = document.getElementById('detailLevelBadge');
    badge.textContent = student.educationLevel;
    badge.className = `badge rounded-3 px-3 py-2 fw-bold level-${getLevelClass(student.educationLevel)}`;

    const uniContainer = document.getElementById('detailUniversities');
    uniContainer.innerHTML = (student.universities || []).map(u => `
        <span class="badge bg-white text-dark border fw-medium px-2 py-1">${u}</span>
    `).join('') || '<div class="text-muted small">N/A</div>';

    document.getElementById('detailLanguage').textContent = student.language || 'N/A';
    document.getElementById('detailNotes').textContent = student.notes || 'No extra notes provided.';

    // Family Info
    const familyContainer = document.getElementById('detailFamilyInfo');
    familyContainer.innerHTML = `
        <div class="col-6">
            <div class="p-2 rounded-3 bg-light border h-100">
                <label class="text-muted small fw-bold text-uppercase mb-1 d-block" style="font-size: 0.65rem;">Father</label>
                ${(student.family?.father || []).map(f => `<div class="small fw-medium" style="font-size: 0.75rem;">• ${f}</div>`).join('') || '<div class="text-muted small" style="font-size: 0.75rem;">No Info</div>'}
            </div>
        </div>
        <div class="col-6">
            <div class="p-2 rounded-3 bg-light border h-100">
                <label class="text-muted small fw-bold text-uppercase mb-1 d-block" style="font-size: 0.65rem;">Mother</label>
                ${(student.family?.mother || []).map(m => `<div class="small fw-medium" style="font-size: 0.75rem;">• ${m}</div>`).join('') || '<div class="text-muted small" style="font-size: 0.75rem;">No Info</div>'}
            </div>
        </div>
    `;

    // Show Modal
    const modalEl = document.getElementById('studentDetailsModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    // Share Button Logic
    const shareBtn = document.getElementById('shareBtn');
    shareBtn.onclick = async () => {
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
        shareBtn.disabled = true;

        try {
            const modalContent = document.querySelector('.modal-content');

            // Wait for images/styles to render perfectly
            await new Promise(resolve => setTimeout(resolve, 800));

            // hide footer + close button temporarily
            const footer = modalContent.querySelector('.modal-footer');
            const closeBtn = modalContent.querySelector('.btn-close');

            if (footer) footer.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'none';

            // Use htmlToImage from window global since app.js is a module
            const blob = await window.htmlToImage.toBlob(modalContent, {
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                style: {
                    borderRadius: '16px',
                    overflow: 'hidden'
                }
            });

            // restore UI
            if (footer) footer.style.display = '';
            if (closeBtn) closeBtn.style.display = '';

            if (!blob) {
                throw new Error('Image conversion failed');
            }

            const file = new File([blob], `${student.name}_Card.jpeg`, { type: 'image/jpeg' });

            // Mobile Share
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `${student.name}'s Student Card`,
                        text: 'Check out this student details card from Koreyada Talim.',
                    });
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('Share failed:', err);
                        // Fallback to download if share fails but not cancelled
                        downloadImage(blob, student.name);
                    }
                }
            } else {
                // Desktop Download Fallback
                downloadImage(blob, student.name);
            }

            resetButton();

        } catch (error) {
            console.error('Error generating image:', error);
            alert('Could not generate image. Please try again.');
            resetButton();
        }

        function resetButton() {
            shareBtn.innerHTML = originalText;
            shareBtn.disabled = false;
        }

        function downloadImage(blob, name) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}_Card.jpeg`;
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

        // 1. Check Student Level
        if (student.educationLevel && student.educationLevel.toUpperCase().includes('1% TOP')) {
            isTop1Percent = true;
        }

        // 2. Check each selected University
        if (!isTop1Percent && student.universities && student.universities.length > 0) {
            try {
                // Firestore 'in' query has a limit of 10. Batch the university names.
                const unisCopy = [...student.universities];
                while (unisCopy.length > 0) {
                    const batch = unisCopy.splice(0, 10); // Get up to 10 university names
                    const q = query(universitiesCol, where("name", "in", batch));
                    const snapshot = await getDocs(q);

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.levels && Array.isArray(data.levels) && data.levels.includes('1% TOP')) {
                            isTop1Percent = true;
                        }
                    });

                    if (isTop1Percent) break; // Found a 1% TOP university, no need to check further
                }
            } catch (error) {
                console.error("Error fetching university details:", error);
            }
        }

        if (isTop1Percent) {
            suggestionBox.textContent = "1% lik Universitetlarga viza chiqishi 100%, Universitetga qabul qilinsangiz bo'ldi. Qabullar erta ochiladi, erta yopiladi, tezroq harakat qiling!";
            suggestionBox.className = "text-success small fw-bold";
            suggestionContainer.className = "h-100 p-2 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-10";
        } else {
            suggestionBox.textContent = "Wait for manager's recommendation...";
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

        const updateView = () => {
            const searchTerm = studentSearch.value.toLowerCase();
            const filterLevel = levelFilter.value;

            const filtered = currentSnapshotStudents.filter(s => {
                const nameMatch = s.name?.toLowerCase().includes(searchTerm);
                const phoneMatch = s.phone?.includes(searchTerm);
                const uniMatch = s.universities?.some(u => u.toLowerCase().includes(searchTerm));
                return (nameMatch || phoneMatch || uniMatch) && (filterLevel === "" || s.educationLevel === filterLevel);
            });

            displayFilteredStudents(filtered);
        };

        studentSearch.addEventListener('input', updateView);
        levelFilter.addEventListener('change', updateView);
        updateView();
    });
}

function displayFilteredStudents(students) {
    if (students.length === 0) {
        studentsList.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No students found.</p></div>`;
        return;
    }

    studentsList.innerHTML = students.map(s => `
        <div class="col-md-6 col-lg-4 mb-4" onclick="openStudentDetails('${s.name}')" style="cursor:pointer;">
            <div class="student-card h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="fw-bold mb-0 text-dark text-uppercase">${s.name}</h5>
                    <span class="level-badge level-${getLevelClass(s.educationLevel)}">${s.educationLevel}</span>
                </div>
                <div class="phone-badge mb-1"><i class="bi bi-phone me-1"></i> ${s.phone}</div>
                <div class="uni-ghost-text">
                    ${(s.universities || []).map(u => `<div class="mb-1"><i class="bi bi-bank2 me-1 small"></i>${u}</div>`).join('')}
                </div>
                <div class="mb-3">
                    <div class="text-muted small mb-1">Language:</div>
                    <div class="fw-bold text-dark small">${s.language}</div>
                </div>
                ${s.notes ? `<div class="p-2 rounded bg-light border-start border-4 border-warning small"><div class="text-muted fw-bold mb-1" style="font-size: 0.6rem;">NOTES</div>${s.notes}</div>` : ''}
            </div>
        </div>
    `).join('');
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
