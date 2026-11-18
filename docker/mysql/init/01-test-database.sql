-- Runs once, when the MySQL volume is first created. The main database
-- comes from MYSQL_DATABASE; the API tests use this separate one.
CREATE DATABASE IF NOT EXISTS baki_khata_mobile_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
