-- Student Result Processing System (SRPS) Database Schema and Seed Data
-- Database: srps_db

CREATE DATABASE IF NOT EXISTS `srps_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `srps_db`;

-- Drop tables if existing (in reverse dependency order)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `approval_records`;
DROP TABLE IF EXISTS `results`;
DROP TABLE IF EXISTS `scores`;
DROP TABLE IF EXISTS `enrolments`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `login_attempts`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `surname` VARCHAR(55) NOT NULL,
  `first_name` VARCHAR(55) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student', 'lecturer', 'exam_officer', 'hod', 'admin') NOT NULL,
  `matric_no` VARCHAR(20) NULL UNIQUE,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Courses Table
CREATE TABLE `courses` (
  `course_id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_code` VARCHAR(15) NOT NULL UNIQUE,
  `course_title` VARCHAR(100) NOT NULL,
  `credit_units` INT NOT NULL,
  `semester` ENUM('First', 'Second') NOT NULL,
  `level` INT NOT NULL DEFAULT 100,
  `lecturer_id` INT NULL,
  CONSTRAINT `fk_courses_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Enrolments Table
CREATE TABLE `enrolments` (
  `enrolment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `session` VARCHAR(15) NOT NULL,
  `semester` ENUM('First', 'Second') NOT NULL,
  `registered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_enrolments_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_enrolments_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_student_course_session` (`student_id`, `course_id`, `session`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Scores Table
CREATE TABLE `scores` (
  `score_id` INT AUTO_INCREMENT PRIMARY KEY,
  `enrolment_id` INT NOT NULL UNIQUE,
  `ca_score` DECIMAL(5,2) NOT NULL CHECK (`ca_score` >= 0 AND `ca_score` <= 30),
  `exam_score` DECIMAL(5,2) NOT NULL CHECK (`exam_score` >= 0 AND `exam_score` <= 70),
  `total_score` DECIMAL(5,2) NOT NULL,
  `grade` VARCHAR(2) NULL,
  `grade_point` DECIMAL(3,2) NULL,
  `submitted_by` INT NULL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_scores_enrolment` FOREIGN KEY (`enrolment_id`) REFERENCES `enrolments` (`enrolment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_scores_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Results Table
CREATE TABLE `results` (
  `result_id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `session` VARCHAR(15) NOT NULL,
  `semester` ENUM('First', 'Second') NOT NULL,
  `total_credit_units` INT NOT NULL,
  `total_grade_points` DECIMAL(6,2) NOT NULL,
  `gpa` DECIMAL(4,2) NOT NULL,
  `cgpa` DECIMAL(4,2) NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `computed_by` INT NULL,
  `computed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_results_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_results_computed_by` FOREIGN KEY (`computed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE KEY `uk_student_session_semester` (`student_id`, `session`, `semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Approval Records Table
CREATE TABLE `approval_records` (
  `approval_id` INT AUTO_INCREMENT PRIMARY KEY,
  `result_id` INT NOT NULL,
  `approved_by` INT NULL,
  `decision` ENUM('approved', 'rejected') NOT NULL,
  `comments` TEXT NULL,
  `decided_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_approvals_result` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_approvals_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Settings Table
CREATE TABLE `settings` (
  `setting_key` VARCHAR(50) PRIMARY KEY,
  `setting_value` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Login Attempts Table (Brute-force protection & rate limiting)
CREATE TABLE `login_attempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_attempt` (`email`, `attempted_at`),
  INDEX `idx_ip_attempt` (`ip_address`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- SEED DATA
-- Default password for all accounts: "Password123"
-- Hashed using password_hash('Password123', PASSWORD_BCRYPT)
-- ==========================================================

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('current_session', '2025/2026'),
('current_semester', 'First');

INSERT INTO `users` (`user_id`, `surname`, `first_name`, `email`, `password`, `role`, `matric_no`, `must_change_password`) VALUES
-- Admin
(1, 'Eze', 'Engr. Nnamdi A.', 'admin@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'admin', NULL, 1),
-- Exam Officer
(2, 'Okeke', 'Mr. Obinna E.', 'obinna.okeke@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'exam_officer', NULL, 1),
-- HOD
(3, 'Ugwu', 'Prof. Charles O.', 'charles.ugwu@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'hod', NULL, 1),
-- Lecturers
(4, 'Ani', 'Dr. Chidinma O.', 'chidinma.ani@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'lecturer', NULL, 1),
(5, 'Nnaji', 'Dr. Kingsley C.', 'kingsley.nnaji@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'lecturer', NULL, 1),
-- Students (300 Level UNN Scholars)
(6, 'Okonkwo', 'Chukwuma', 'chukwuma.okonkwo@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'student', '2021/245101', 1),
(7, 'Eze', 'Ngozi', 'ngozi.eze@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'student', '2021/245102', 1),
(8, 'Nnamani', 'Emmanuel', 'emmanuel.nnamani@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'student', '2021/245103', 1),
(9, 'Adeleke', 'Chioma', 'chioma.adeleke@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'student', '2021/245104', 1),
(10, 'Okafor', 'Babatunde', 'babatunde.okafor@unn.edu.ng', '$2y$10$eVdBqMh0jlZvlLGsXPngnucZolVOvyhv1A..DC38LHzGkS95yRRiO', 'student', '2021/245105', 1);

-- 6 Sample Courses assigned to Lecturer 1 (Dr. Ani, id: 4) and Lecturer 2 (Dr. Nnaji, id: 5)
INSERT INTO `courses` (`course_id`, `course_code`, `course_title`, `credit_units`, `semester`, `level`, `lecturer_id`) VALUES
(1, 'CSC 301', 'Algorithms and Complexity', 3, 'First', 300, 4),
(2, 'CSC 303', 'Operating Systems', 3, 'First', 300, 4),
(3, 'CSC 305', 'Database Design', 3, 'First', 300, 5),
(4, 'CSC 307', 'Software Engineering', 2, 'First', 300, 5),
(5, 'CSC 309', 'Computer Networks', 3, 'First', 300, 4),
(6, 'MTH 301', 'Numerical Methods', 3, 'First', 300, 5);
