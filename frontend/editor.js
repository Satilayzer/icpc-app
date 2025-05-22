// Запити для редагування
const editRoutes = [
    { label: 'Додати учасника (POST)', method: 'POST', url: '/participants' },
    { label: 'Оновити учасника (PUT)', method: 'PUT', url: '/participants/:id' },
    { label: 'Видалити учасника (DELETE)', method: 'DELETE', url: '/participants/:id' },
    { label: 'Додати тренера (POST)', method: 'POST', url: '/coaches' },
    { label: 'Оновити тренера (PUT)', method: 'PUT', url: '/coaches/:id' },
    { label: 'Видалити тренера (DELETE)', method: 'DELETE', url: '/coaches/:id' }
];

// Завантаження edit-маршрутів
function populateEditRoutes() {
    const editDropdown = document.getElementById('editRequests');
    editRoutes.forEach(({ label }, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = label;
        editDropdown.appendChild(option);
    });
}

async function sendEdit() {
    const selected = editRoutes[document.getElementById('editRequests').value];
    const rawInput = document.getElementById('editDataInput').value.trim();

    if (!rawInput) {
        alert('Введіть дані для запиту');
        return;
    }

    let url = selected.url;
    let options = {
        method: selected.method,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        if (selected.method === 'POST') {
            options.body = rawInput;
        } else if (selected.method === 'PUT') {
            const json = JSON.parse(rawInput);
            if (!json.id) {
                alert('Для PUT запиту потрібно передати поле "id"');
                return;
            }
            url = url.replace(':id', json.id);
            delete json.id;
            options.body = JSON.stringify(json);
        } else if (selected.method === 'DELETE') {
            url = url.replace(':id', encodeURIComponent(rawInput));
            delete options.headers;
        }

        const response = await fetch(`http://localhost:3000${url}`, options);
        const responseBox = document.getElementById('responseBox');
        const contentType = response.headers.get('content-type') || '';

        let resultText = '';
        if (contentType.includes('application/json')) {
            const json = await response.json();
            resultText = JSON.stringify(json, null, 2);
        } else {
            resultText = await response.text();
        }

        responseBox.style.display = 'block';
        responseBox.textContent = `✅ Відповідь сервера:\n${resultText}`;
    } catch (error) {
        alert('❌ Помилка при виконанні запиту');
        console.error(error);
    }
}

document.getElementById('sendEditRequest').addEventListener('click', sendEdit);
window.addEventListener('DOMContentLoaded', populateEditRoutes);
