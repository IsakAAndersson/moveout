--
-- ddl for MoveOut
--

DELETE FROM `customer`;
DELETE FROM `label`;
ALTER TABLE `customer` AUTO_INCREMENT = 1;
ALTER TABLE `label` AUTO_INCREMENT = 1;


DROP TABLE IF EXISTS `customer`;
DROP TABLE IF EXISTS `label`;

CREATE TABLE `customer` (
    `customer_id` INTEGER AUTO_INCREMENT NOT NULL,
    `mail` VARCHAR(80) NOT NULL,
    `status` ENUM('verified', 'unverified'),
    `password` VARCHAR(255),
    
    PRIMARY KEY (`customer_id`)
);

CREATE TABLE `label` (
    `label_id` INTEGER AUTO_INCREMENT NOT NULL,
    `type` ENUM('fragile', 'heavy', 'standard'),
    `customer_id` INTEGER,
    `qr_path` VARCHAR(100),
    `status` ENUM('active', 'deleted'),
    `description` TEXT,
    `private` ENUM('private', 'public'),
    
    PRIMARY KEY (`label_id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
);

CREATE TABLE `admin` (
    `admin_id` INTEGER AUTO_INCREMENT NOT NULL,
    `type` ENUM('general', 'super'),
    `mail` VARCHAR(80),

    PRIMARY KEY (`admin_id`)
);