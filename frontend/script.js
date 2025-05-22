// Завантаження доступних маршрутів з сервера
async function fetchRoutes() {
    try {
        const response = await fetch('http://localhost:3000/routes');
        const routes = await response.json();

        const apiDropdown = document.getElementById('apiRequests');
        apiDropdown.innerHTML = '';

        routes.forEach(({ label, value }) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            apiDropdown.appendChild(option);
        });

        // Зберігаємо map з label -> value для подальшого використання
        window.routeMap = Object.fromEntries(routes.map(({ label, value }) => [label, value]));
    } catch (error) {
        console.error('Ошибка при загрузке маршрутов:', error);
    }
}

// Підставлення параметрів у маршрут типу /route/:id/:name
function fillRouteWithParams(route, paramValues) {
    let index = 0;
    return route.replace(/:([a-zA-Z_]+)/g, (_, paramName) => {
        let value = paramValues[index++] || '';
        value = value.replace(/^\/+|\/+$/g, '');
        return encodeURIComponent(value);
    });
}

// Запит даних і відображення у вигляді таблиці
async function loadDataForRoute(fullRoute) {
    try {
        const normalizedRoute = fullRoute.startsWith('/') ? fullRoute.slice(1) : fullRoute;

        console.log(`📡 Запрашиваем маршрут: http://localhost:3000/${normalizedRoute}`);

        const response = await fetch(`http://localhost:3000/${normalizedRoute}`);
        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const table = document.getElementById('dataTable');
        const thead = document.getElementById('tableHead');
        const tbody = document.getElementById('tableBody');
        const responseBox = document.getElementById('responseBox');

        responseBox.style.display = 'none';

        if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]);
            thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
            tbody.innerHTML = data.map(row => {
                return '<tr>' + headers.map(h => `<td>${row[h] ?? '-'}</td>`).join('') + '</tr>';
            }).join('');
            table.style.display = 'table';
        } else if (typeof data === 'object' && data !== null) {
            const headers = Object.keys(data);
            thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
            tbody.innerHTML = '<tr>' + headers.map(h => `<td>${data[h] ?? '-'}</td>`).join('') + '</tr>';
            table.style.display = 'table';
        } else {
            table.style.display = 'none';
            responseBox.textContent = JSON.stringify(data, null, 2);
            responseBox.style.display = 'block';
        }

    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Ошибка при загрузке данных. Подробности — в консоли.');
    }
}

// Обробник натискання кнопки "Сгенерировать таблицу"
document.getElementById('generateButton').addEventListener('click', () => {
    const label = document.getElementById('apiRequests').selectedOptions[0].textContent;
    const route = window.routeMap[label]; // Отримуємо реальний маршрут
    if (!route) {
        alert('Маршрут не знайдено!');
        return;
    }

    const rawParams = document.getElementById('paramInput').value.trim();
    const queryParams = document.getElementById('queryParamsInput').value.trim();

    const hasPathParams = route.includes(':');
    let fullRoute = route;

    if (hasPathParams) {
        if (!rawParams) {
            alert('Введіть параметри для маршруту (через кому)');
            return;
        }
        const paramValues = rawParams.split(',').map(p => p.trim());
        fullRoute = fillRouteWithParams(route, paramValues);
    }

    if (queryParams) {
        fullRoute += (fullRoute.includes('?') ? '&' : '?') + queryParams;
    }

    console.log('Запит до:', fullRoute);
    loadDataForRoute(fullRoute);
});

// Очищення полів при зміні маршруту
document.getElementById('apiRequests').addEventListener('change', () => {
    document.getElementById('paramInput').value = '';
    document.getElementById('queryParamsInput').value = '';
});

// Завантаження маршрутів при старті сторінки
window.addEventListener('DOMContentLoaded', fetchRoutes);
