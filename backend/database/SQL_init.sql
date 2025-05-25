-- Створення закладів
CREATE TABLE Institution (
                             institution_id SERIAL PRIMARY KEY,
                             name TEXT NOT NULL
);

-- Таблиця учасників команд
CREATE TABLE Participant (
                             participant_id SERIAL PRIMARY KEY,
                             name TEXT NOT NULL,
                             email TEXT,
                             team_id INT REFERENCES Team(team_id) ON DELETE CASCADE
);

-- Таблиця тренерів
CREATE TABLE Coach (
                       coach_id SERIAL PRIMARY KEY,
                       name TEXT NOT NULL,
                       email TEXT,
                       team_id INT UNIQUE REFERENCES Team(team_id) ON DELETE CASCADE
);


-- Команди
CREATE TABLE Team (
                      team_id SERIAL PRIMARY KEY,
                      name TEXT NOT NULL,
                      education_level TEXT NOT NULL,
                      institution_id INT REFERENCES Institution(institution_id)
);

-- Мови програмування
CREATE TABLE Language (
                          language_id SERIAL PRIMARY KEY,
                          name TEXT NOT NULL
);

-- Спроби
CREATE TABLE Submission (
                            submission_id SERIAL PRIMARY KEY,
                            team_id INT REFERENCES Team(team_id),
                            language_id INT REFERENCES Language(language_id),
                            problem_code TEXT NOT NULL,
                            verdict TEXT NOT NULL,
                            code TEXT,
                            submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Kulki (
                       problem_code TEXT PRIMARY KEY,  -- кожна задача лише раз отримає кульку
                       team_id INT REFERENCES Team(team_id),
                       submission_id INT REFERENCES Submission(submission_id),
                       awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO Kulki (problem_code, team_id, submission_id)
SELECT s.problem_code, s.team_id, s.submission_id
FROM Submission s
         JOIN (
    SELECT problem_code, MIN(submission_time) AS first_ok_time
    FROM Submission
    WHERE verdict = 'OK'
    GROUP BY problem_code
) AS first_ok
              ON s.problem_code = first_ok.problem_code
                  AND s.submission_time = first_ok.first_ok_time
WHERE s.verdict = 'OK'
  AND s.problem_code NOT IN (SELECT problem_code FROM Kulki);

-- Прикладові дані
INSERT INTO Institution(name) VALUES ('КПІ'), ('ЛНУ'), ('КНЕУ');

INSERT INTO Team(name, education_level, institution_id)
VALUES
    ('KPI_Coders', 'університет', 1),
    ('LNU_Brainstorm', 'університет', 2),
    ('KNEU_Techies', 'коледж', 3);

INSERT INTO Language(name) VALUES ('C++'), ('Java'), ('Python');

INSERT INTO Submission(team_id, language_id, problem_code, verdict, code)
VALUES
    (1, 1, 'A', 'OK', '...код...'),
    (1, 3, 'B', 'WA', '...код...'),
    (2, 3, 'A', 'TL', '...код...'),
    (3, 2, 'C', 'OK', '...код...');

-- Додаємо учасників для команди 1
INSERT INTO Participant (name, email, team_id) VALUES
                                                   ('Олександр Іваненко', 'sasha1@example.com', 1),
                                                   ('Марія Коваленко', 'masha2@example.com', 1),
                                                   ('Ігор Петренко', 'ihor3@example.com', 1);

-- Додаємо тренера
INSERT INTO Coach (name, email, team_id) VALUES
    ('Тетяна Мельник', 'coach1@example.com', 1);
