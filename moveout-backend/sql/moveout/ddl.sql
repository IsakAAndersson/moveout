--
-- ddl for MoveOut
--

DELETE FROM `label_images`;
DELETE FROM `label_audio`;
DELETE FROM `verification_tokens`;
DELETE FROM `label`;
DELETE FROM `customer`;

DROP TABLE IF EXISTS `label_images`;
DROP TABLE IF EXISTS `label_audio`;
DROP TABLE IF EXISTS `verification_tokens`;
DROP TABLE IF EXISTS `customer`;
DROP TABLE IF EXISTS `label`;

ALTER TABLE `customer` AUTO_INCREMENT = 1;
ALTER TABLE `label` AUTO_INCREMENT = 1;
ALTER TABLE `verification_tokens` AUTO_INCREMENT = 1;
ALTER TABLE `label_images` AUTO_INCREMENT = 1;
ALTER TABLE `label_audio` AUTO_INCREMENT = 1;

CREATE TABLE `customer` (
    `customer_id` INTEGER AUTO_INCREMENT NOT NULL,
    `mail` VARCHAR(80) NOT NULL,
    `status` ENUM('verified', 'unverified', 'deactivated'),
    `password` VARCHAR(255),
    `role` ENUM('user', 'admin') DEFAULT 'user',
    
    PRIMARY KEY (`customer_id`),
    UNIQUE (`mail`)
);

CREATE TABLE `label` (
    `label_id` INTEGER AUTO_INCREMENT NOT NULL,
    `label_name` VARCHAR(50),
    `type` ENUM('fragile', 'heavy', 'standard'),
    `customer_id` INTEGER,
    `qr_path` VARCHAR(100),
    `status` ENUM('active', 'deleted'),
    `textDescription` TEXT,
    `isPrivate` ENUM('private', 'public'),
    `pin` INTEGER,
    
    PRIMARY KEY (`label_id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
);

CREATE TABLE `verification_tokens` (
    `verification_id` INTEGER AUTO_INCREMENT NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `mail` VARCHAR(80) NOT NULL,
    `expiration_date` DATETIME NOT NULL,
    PRIMARY KEY (`verification_id`),
    UNIQUE (`token`),
    FOREIGN KEY (`mail`) REFERENCES `customer`(`mail`) ON DELETE CASCADE
);

CREATE TABLE `label_images` (
    `image_id` INTEGER AUTO_INCREMENT NOT NULL,
    `label_id` INTEGER NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`image_id`),
    FOREIGN KEY (`label_id`) REFERENCES `label` (`label_id`) ON DELETE CASCADE
);

CREATE TABLE `label_audio` (
    `audio_id` INTEGER AUTO_INCREMENT NOT NULL,
    `label_id` INTEGER NOT NULL,
    `audio_url` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`audio_id`),
    FOREIGN KEY (`label_id`) REFERENCES `label` (`label_id`) ON DELETE CASCADE
);
