document.addEventListener("DOMContentLoaded", () => {
    const timerElement = document.getElementById('timer');
    const activityInput = document.getElementById('activity');
    const colorPicker = document.getElementById('colorPicker');
    const savedSegmentsContainer = document.getElementById('saved-segments');
    const editActivityModal = document.getElementById('editActivityModal');
    const editActivityInput = document.getElementById('editActivityInput');
    const confirmEditButton = document.getElementById('confirmEditButton');
    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const confirmDeleteButton = document.getElementById('confirmDeleteButton');
    
    let startTime, updatedTime, difference, tInterval;
    let running = false;
    let segments = [];
    let unsavedChanges = false;

    const startButton = document.getElementById('start');
    const stopButton = document.getElementById('stop');
    const resetButton = document.getElementById('reset');
    const saveButton = document.getElementById('save');
    
    startButton.addEventListener('click', startTimer);
    stopButton.addEventListener('click', stopTimer);
    resetButton.addEventListener('click', () => {
        showResetConfirmation();
    });
    saveButton.addEventListener('click', saveSegment);

    function startTimer() {
        const activity = activityInput.value.trim();
        if (!activity) {
            showAlert("Debes escribir el nombre de la actividad antes de iniciar el cronómetro.", 'danger');
            return;
        }
        if (!running) {
            startTime = new Date().getTime() - (difference || 0);
            tInterval = setInterval(updateTimer, 1000);
            running = true;
        }
    }

    function stopTimer() {
        if (running) {
            clearInterval(tInterval);
            running = false;
            unsavedChanges = true;
        }
    }

    function resetTimer() {
        clearInterval(tInterval);
        running = false;
        difference = 0;
        timerElement.innerHTML = "00:00:00";
        unsavedChanges = false;
    }

    function showResetConfirmation() {
        const message = "¿Estás seguro de que quieres reiniciar el cronómetro?";
        const type = 'warning';
        const showConfirmation = true; // Indicar que se debe mostrar la confirmación
        const callback = (confirmed) => {
            if (confirmed) {
                resetTimer();
            }
        };
        showAlert(message, type, showConfirmation, callback);
    }

    function updateTimer() {
        updatedTime = new Date().getTime();
        difference = updatedTime - startTime;
        
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        timerElement.innerHTML = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function saveSegment() {
        const activity = activityInput.value.trim();
        if (!activity) {
            showAlert("No puedes guardar sin escribir la actividad.", 'info');
            return;
        }
        if (!difference || difference <= 0) {
            showAlert("No puedes guardar sin iniciar el cronómetro.", 'info');
            return;
        }
        
        const color = colorPicker.value;

        const segment = {
            activity,
            color,
            time: difference,
        };

        segments.push(segment);
        saveSegmentsToCookies();
        showAlert("Segmento guardado exitosamente.", 'success');
        resetTimer();
        activityInput.value = '';
    }

    // Funciones para manejar cookies
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function eraseCookie(name) {
        document.cookie = name + '=; Max-Age=-99999999;';
    }

    function saveSegmentsToCookies() {
        const savedSegments = JSON.parse(getCookie('segments') || '{}');
        const today = new Date();
        const date = today.toLocaleDateString();

        if (!savedSegments[date]) savedSegments[date] = [];

        segments.forEach(segment => {
            const existingSegment = savedSegments[date].find(s => s.activity === segment.activity && s.color === segment.color);
            if (existingSegment) {
                existingSegment.time += segment.time;
            } else {
                savedSegments[date].unshift(segment); // Add new segments to the start of the array
            }
        });

        setCookie('segments', JSON.stringify(savedSegments), 365);
        segments = [];
        displaySavedSegments();
    }

    function displaySavedSegments() {
        savedSegmentsContainer.innerHTML = '';
        const savedSegments = JSON.parse(getCookie('segments') || '{}');
        Object.keys(savedSegments).forEach(date => {
            const dateDiv = document.createElement('div');
            dateDiv.innerHTML = `<h3>${date}</h3>`;
            savedSegmentsContainer.prepend(dateDiv);

            savedSegments[date].forEach((segment, index) => {
                const segmentDiv = document.createElement('div');
                segmentDiv.className = `segment ${segment.color} alert alert-${getBootstrapAlertColor(segment.color)}`;
                
                const time = convertMsToTime(segment.time);
                segmentDiv.innerHTML = `${time} - ${segment.activity} <button class="delete-button btn btn-danger" onclick="confirmDeleteSegment('${date}', ${index})">Eliminar</button> <button class="edit-button btn btn-light" onclick="editSegment('${date}', ${index})">Editar</button>`;
                
                dateDiv.appendChild(segmentDiv);
            });
        });
    }

    function convertMsToTime(milliseconds) {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    window.confirmDeleteSegment = function(date, index) {
        confirmDeleteModal.setAttribute('data-date', date);
        confirmDeleteModal.setAttribute('data-index', index);
        $('#confirmDeleteModal').modal('show');
    };

    confirmDeleteButton.addEventListener('click', function() {
        const date = confirmDeleteModal.getAttribute('data-date');
        const index = parseInt(confirmDeleteModal.getAttribute('data-index'));

        deleteSegment(date, index);
        $('#confirmDeleteModal').modal('hide');
    });

    window.deleteSegment = function(date, index) {
        const savedSegments = JSON.parse(getCookie('segments') || '{}');
        if (savedSegments[date]) {
            savedSegments[date].splice(index, 1);
            if (savedSegments[date].length === 0) {
                delete savedSegments[date];
            }
            setCookie('segments', JSON.stringify(savedSegments), 365);
            displaySavedSegments();
        }
    };

    window.editSegment = function(date, index) {
        const savedSegments = JSON.parse(getCookie('segments') || '{}');
        if (savedSegments[date] && savedSegments[date][index]) {
            $('#editActivityModal').modal('show');
            editActivityInput.value = savedSegments[date][index].activity;
            confirmEditButton.onclick = function() {
                const newActivity = editActivityInput.value.trim();
                if (newActivity !== savedSegments[date][index].activity) {
                    const existingSegment = savedSegments[date].find((segment, idx) => segment.activity === newActivity && idx !== index);
                    if (existingSegment) {
                        existingSegment.time += savedSegments[date][index].time;
                        savedSegments[date].splice(index, 1);
                    } else {
                        savedSegments[date][index].activity = newActivity;
                    }
                    setCookie('segments', JSON.stringify(savedSegments), 365);
                    displaySavedSegments();
                    showAlert("Actividad editada exitosamente.", 'info');
                }
                $('#editActivityModal').modal('hide');
            };
        }
    };

    function showAlert(message, type, showConfirmation = false, callback) {
        const alertContainer = document.querySelector('.alert-container');
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show fade-in`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            <div class="alert-progress">
                <div class="alert-progress-bar"></div>
            </div>
        `;
        if (showConfirmation) {
            alertDiv.innerHTML += `
                <button id="confirm-yes" class="btn btn-danger bototonesReinicio">Sí</button>
                <button id="confirm-no" class="btn btn-secondary bototonesReinicio">No</button>
            `;
        }
        alertContainer.prepend(alertDiv);
        setTimeout(() => {
            alertDiv.querySelector('.alert-progress-bar').style.width = '100%';
        }, 10);
        if (showConfirmation) {
            const timeoutId = setTimeout(() => {
                $(alertDiv).alert('close');
                if (callback) callback(false);
            }, 7000);
            alertDiv.querySelector('#confirm-yes').addEventListener('click', () => {
                clearTimeout(timeoutId);
                $(alertDiv).alert('close');
                if (callback) callback(true);
            });
            alertDiv.querySelector('#confirm-no').addEventListener('click', () => {
                clearTimeout(timeoutId);
                $(alertDiv).alert('close');
                if (callback) callback(false);
            });
        } else {
            setTimeout(() => {
                $(alertDiv).alert('close');
                if (callback) callback();
            }, 7000);
        }
    }

    function getBootstrapAlertColor(color) {
        switch(color) {
            case 'red': return 'danger';
            case 'green': return 'success';
            case 'blue': return 'primary';
            case 'yellow': return 'warning';
            case 'orange': return 'warning';
            default: return 'secondary';
        }
    }

    displaySavedSegments();

    window.addEventListener('beforeunload', function (e) {
        e.preventDefault();
        e.returnValue = '';
        return '¿Estás seguro de que quieres cerrar esta página?';
    });
});
