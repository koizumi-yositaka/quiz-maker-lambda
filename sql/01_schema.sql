CREATE TABLE t_quiz (
    quiz_id VARCHAR(255) PRIMARY KEY,
    author_id VARCHAR(255) NOT NULL,
    allow_multiple_answers TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE t_quiz_distribution (
    quiz_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (quiz_id, email),
    FOREIGN KEY (quiz_id) REFERENCES t_quiz(quiz_id)
);

CREATE TABLE t_quiz_response (
    quiz_id VARCHAR(255) NOT NULL,
    respondent_email VARCHAR(255) NOT NULL,
    version INT NOT NULL,
    score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (quiz_id, respondent_email, version),
    FOREIGN KEY (quiz_id) REFERENCES t_quiz(quiz_id)
);