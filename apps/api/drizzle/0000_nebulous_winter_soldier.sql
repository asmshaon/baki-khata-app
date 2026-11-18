CREATE TABLE `customers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`name` varchar(80) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`address` varchar(160),
	`photo_path` varchar(200),
	`pin_hash` varchar(100),
	`balance` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_shop_phone_unique` UNIQUE(`shop_id`,`phone`)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`pin_hash` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owners_id` PRIMARY KEY(`id`),
	CONSTRAINT `owners_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`owner_id` bigint unsigned NOT NULL,
	`name` varchar(80) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`customer_id` bigint unsigned NOT NULL,
	`type` enum('baki','joma') NOT NULL,
	`amount` int NOT NULL,
	`note` varchar(160),
	`balance_after` int NOT NULL,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_owner_id_owners_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_created_by_owners_id_fk` FOREIGN KEY (`created_by`) REFERENCES `owners`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `transactions_customer_created_idx` ON `transactions` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `transactions_shop_created_idx` ON `transactions` (`shop_id`,`created_at`);