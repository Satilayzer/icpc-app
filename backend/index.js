const express = require('express');
const cors = require('cors');
const db = require('./db');

// Перевірка з'єднання
db.query('SELECT NOW()')
    .then(res => console.log('✅ Підключення до бази даних встановлено:', res.rows[0]))
    .catch(err => console.error('❌ Помилка підключення до БД:', err));

const app = express();
app.use(cors());
app.use(express.json());

// Отримати всіх учасників
app.get('/participants', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, t.name AS team_name
            FROM Participant p
                     JOIN Team t ON p.team_id = t.team_id
            ORDER BY p.participant_id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка сервера');
    }
});

// Отримати учасників певної команди
app.get('/participants/:team_id', async (req, res) => {
    const { team_id } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM Participant WHERE team_id = $1`,
            [team_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка сервера');
    }
});

// Додати учасника
app.post('/participants', async (req, res) => {
    const { name, email, team_id } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO Participant (name, email, team_id)
             VALUES ($1, $2, $3) RETURNING *`,
            [name, email, team_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при додаванні учасника');
    }
});

// Отримати всіх тренерів
app.get('/coaches', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, t.name AS team_name
            FROM Coach c
                     JOIN Team t ON c.team_id = t.team_id
            ORDER BY c.coach_id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка сервера');
    }
});

// Отримати тренера певної команди
app.get('/coaches/:team_id', async (req, res) => {
    const { team_id } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM Coach WHERE team_id = $1`,
            [team_id]
        );
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка сервера');
    }
});

// Додати тренера
app.post('/coaches', async (req, res) => {
    const { name, email, team_id } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO Coach (name, email, team_id)
             VALUES ($1, $2, $3) RETURNING *`,
            [name, email, team_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при додаванні тренера');
    }
});

// Оновити учасника
app.put('/participants/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, team_id } = req.body;
    try {
        const result = await db.query(
            `UPDATE Participant
             SET name = $1, email = $2, team_id = $3
             WHERE participant_id = $4
             RETURNING *`,
            [name, email, team_id, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при оновленні учасника');
    }
});

// Видалити учасника
app.delete('/participants/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`DELETE FROM Participant WHERE participant_id = $1`, [id]);
        res.sendStatus(204); // No Content
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при видаленні учасника');
    }
});

// Оновити тренера
app.put('/coaches/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, team_id } = req.body;
    try {
        const result = await db.query(
            `UPDATE Coach
             SET name = $1, email = $2, team_id = $3
             WHERE coach_id = $4
             RETURNING *`,
            [name, email, team_id, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при оновленні тренера');
    }
});

// Видалити тренера
app.delete('/coaches/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`DELETE FROM Coach WHERE coach_id = $1`, [id]);
        res.sendStatus(204);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при видаленні тренера');
    }
});

// Отримати список спроб по командам
app.get('/submissions', async (req, res) => {
    const { language, institution, level } = req.query;

    let query = `
        SELECT s.submission_id, t.name AS team, i.name AS institution, 
               t.education_level, l.name AS language, 
               s.problem_code, s.verdict, s.submission_time
        FROM Submission s
        JOIN Team t ON s.team_id = t.team_id
        JOIN Institution i ON t.institution_id = i.institution_id
        JOIN Language l ON s.language_id = l.language_id
        WHERE 1=1
    `;
    const params = [];

    if (language) {
        query += ` AND l.name = $${params.length + 1}`;
        params.push(language);
    }

    if (institution) {
        query += ` AND i.name = $${params.length + 1}`;
        params.push(institution);
    }

    if (level) {
        query += ` AND t.education_level = $${params.length + 1}`;
        params.push(level);
    }

    try {
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Фільтрація сабмішенів
app.get('/submissions/filter', async (req, res) => {
    const { institution, education, language, verdict } = req.query;

    let query = `
        SELECT
            s.*,
            t.name AS team_name,
            l.name AS language_name,
            i.name AS institution_name,
            t.education_level
        FROM Submission s
                 JOIN Team t ON s.team_id = t.team_id
                 JOIN Language l ON s.language_id = l.language_id
                 JOIN Institution i ON t.institution_id = i.institution_id
        WHERE 1=1
    `;
    const params = [];

    if (institution) {
        params.push(institution);
        query += ` AND i.name = $${params.length}`;
    }

    if (education) {
        params.push(education);
        query += ` AND t.education_level = $${params.length}`;
    }

    if (language) {
        params.push(language);
        query += ` AND l.name = $${params.length}`;
    }

    if (verdict) {
        params.push(verdict);
        query += ` AND s.verdict = $${params.length}`;
    }

    query += ` ORDER BY s.submission_time DESC`;

    try {
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка сервера');
    }
}); 

// Статистика: кількість сабмішенів за мовами
app.get('/stats/submissions-by-language', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT l.name AS language, COUNT(*) AS count
            FROM Submission s
                     JOIN Language l ON s.language_id = l.language_id
            GROUP BY l.name
            ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при отриманні статистики за мовами');
    }
});

// Статистика: кількість сабмішенів за днями
app.get('/stats/submissions-by-day', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DATE(submission_time) AS day, COUNT(*) AS count
            FROM Submission
            GROUP BY day
            ORDER BY day
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при отриманні статистики по днях');
    }
});

// Останні сабмішени
app.get('/submissions/recent', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    try {
        const result = await db.query(`
            SELECT s.*, t.name AS team_name
            FROM Submission s
            JOIN Team t ON s.team_id = t.team_id
            ORDER BY submission_time DESC
            LIMIT $1
        `, [limit]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при отриманні останніх спроб');
    }
});

// Команди без жодного OK сабмішена
app.get('/teams/no-ok', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.team_id, t.name AS team_name, i.name AS institution_name
            FROM Team t
                     JOIN Institution i ON t.institution_id = i.institution_id
                     LEFT JOIN Submission s ON t.team_id = s.team_id AND s.verdict = 'OK'
            GROUP BY t.team_id, t.name, i.name
            HAVING COUNT(s.verdict) = 0
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при виборці команд без OK');
    }
});

// Статистика найпоширеніших помилок
app.get('/stats/common-errors', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT verdict, COUNT(*) AS count
            FROM Submission
            WHERE verdict != 'OK'
            GROUP BY verdict
            ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при отриманні частих помилок');
    }
});

// Пошук команд за назвою або інституцією
app.get('/teams/search', async (req, res) => {
    const query = req.query.q || '';
    try {
        const result = await db.query(`
            SELECT t.team_id, t.name, i.name AS institution
            FROM Team t
                     JOIN Institution i ON t.institution_id = i.institution_id
            WHERE t.name ILIKE $1 OR i.name ILIKE $1
            ORDER BY t.name
        `, [`%${query}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при пошуку команд');
    }
});

// Спроби команди
app.get('/submissions/team/:team_id', async (req, res) => {
    const { team_id } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM Submission WHERE team_id = $1 ORDER BY submission_id DESC`,
            [team_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при отриманні спроб команди');
    }
});

// Результати по інституції
app.get('/results/institution/:institution', async (req, res) => {
    const { institution } = req.params;
    try {
        const result = await db.query(
            `SELECT s.*
             FROM Submission s
                      JOIN Team t ON s.team_id = t.team_id
                      JOIN Institution i ON t.institution_id = i.institution_id
             WHERE i.name ILIKE $1`,
            [institution]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при виборці за закладом');
    }
});

// Результати за рівнем освіти
app.get('/results/education-level/:level', async (req, res) => {
    const { level } = req.params;
    try {
        const result = await db.query(
            `SELECT s.* FROM Submission s
             JOIN Team t ON s.team_id = t.team_id
             WHERE t.education_level ILIKE $1`,
            [level]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при виборці за рівнем освіти');
    }
});

// Фільтрація за мовою
app.get('/submissions/lang/:language', async (req, res) => {
    const { language } = req.params;
    try {
        const result = await db.query(
            `SELECT s.*
             FROM Submission s
                      JOIN Language l ON s.language_id = l.language_id
             WHERE l.name ILIKE $1`,
            [language]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при фільтрації за мовою');
    }
});

// Статистика по вердикту
app.get('/stats/verdict/:verdict', async (req, res) => {
    const { verdict } = req.params;
    try {
        const result = await db.query(
            `SELECT COUNT(*) FROM Submission WHERE verdict = $1`,
            [verdict]
        );
        res.json({ verdict, count: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при підрахунку вердиктів');
    }
});

// Таблиця лідерів
app.get('/leaderboard', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                t.team_id,
                t.name AS team_name,
                i.name AS institution_name,
                COUNT(*) AS ok_count
            FROM Submission s
                     JOIN Team t ON s.team_id = t.team_id
                     JOIN Institution i ON t.institution_id = i.institution_id
            WHERE s.verdict = 'OK'
            GROUP BY t.team_id, t.name, i.name
            ORDER BY ok_count DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при створенні таблиці лідерів');
    }
});

// Отримання кодів по команді
// NEED FIX
/*
app.get('/submissions/:team_id/code', async (req, res) => {
    const { team_id } = req.params;
    try {
        const result = await db.query(
            `SELECT submission_id, verdict, language, code
             FROM Submission
             WHERE team_id = $1
             ORDER BY submission_id DESC`,
            [team_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка при отриманні кодів');
    }
});
*/

// Інституції
app.get('/institutions', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Institution ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка сервера');
    }
});

// Команди
app.get('/teams', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, i.name AS institution_name
            FROM Team t
            JOIN Institution i ON t.institution_id = i.institution_id
            ORDER BY t.name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка сервера');
    }
});

// Мови програмування
app.get('/languages', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Language ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Помилка сервера');
    }
});

// Список кульок
app.get('/kulki', async (req, res) => {
    try {
        const query = `
            SELECT 
                k.problem_code,
                k.team_id,
                t.name AS team_name,
                k.submission_id,
                k.awarded_at
            FROM Kulki k
            JOIN Team t ON t.team_id = k.team_id
            ORDER BY k.awarded_at;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Помилка при отриманні кульок:', err);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Виявлення нових кульок
app.get('/kulki/new', async (req, res) => {
    try {
        const query = `
            SELECT s.problem_code, s.team_id, s.submission_id
            FROM Submission s
            JOIN (
                SELECT problem_code, MIN(submission_time) AS first_ok_time
                FROM Submission
                WHERE verdict = 'OK'
                GROUP BY problem_code
            ) AS first_ok ON s.problem_code = first_ok.problem_code AND s.submission_time = first_ok.first_ok_time
            WHERE s.verdict = 'OK'
              AND s.problem_code NOT IN (SELECT problem_code FROM Kulki);
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Помилка при отриманні нових кульок:', err);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Присвоїти кульки
app.post('/kulki/award', async (req, res) => {
    try {
        const query = `
            INSERT INTO Kulki (problem_code, team_id, submission_id)
            SELECT s.problem_code, s.team_id, s.submission_id
            FROM Submission s
            JOIN (
                SELECT problem_code, MIN(submission_time) AS first_ok_time
                FROM Submission
                WHERE verdict = 'OK'
                GROUP BY problem_code
            ) AS first_ok ON s.problem_code = first_ok.problem_code AND s.submission_time = first_ok.first_ok_time
            WHERE s.verdict = 'OK'
              AND s.problem_code NOT IN (SELECT problem_code FROM Kulki);
        `;
        const result = await db.query(query);
        res.json({ message: 'Кульки успішно присвоєно.' });
    } catch (err) {
        console.error('Помилка при присвоєнні кульок:', err);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});


app.get('/routes', (req, res) => {
    res.json([
        { label: 'Команди', value: 'teams' },
        { label: 'Учасники', value: 'participants' },
        { label: 'Тренери', value: 'coaches' },
        { label: 'Сабмішени', value: 'submissions' },
        { label: 'Мови програмування', value: 'languages' },
        { label: 'Заклади освіти', value: 'institutions' },
        { label: 'Тренери конкретної команди', value: '/coaches/:team_id' },
        { label: 'Сабмішени за мовами', value: '/stats/submissions-by-language' },
        { label: 'Сабмішени за днями', value: '/stats/submissions-by-day' },
        { label: 'Найчастіші помилки', value: '/stats/common-errors' },
        { label: 'Статистика по вердикту', value: '/stats/verdict/:verdict' },
        { label: 'Таблиця лідерів', value: '/leaderboard' },
        { label: 'Команди без жодного OK', value: '/teams/no-ok' },
        { label: 'Сабмішени команди', value: '/submissions/team/:team_id' },
        { label: 'Сабмішени за мовою', value: '/submissions/lang/:language' },
        { label: 'Результати за закладом освіти', value: '/results/institution/:institution' },
        { label: 'Результати за рівнем освіти', value: '/results/education-level/:level' },
        { label: 'Фільтровані сабмішени', value: '/submissions/filter' },
        { label: 'Пошук команд ', value: '/teams/search' },
        { label: 'Список кульок ', value: '/kulki' },
        { label: 'Виявлення нових кульок ', value: '/kulki/new' },
    ]);
});


app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

