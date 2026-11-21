ALTER TABLE `customers` ADD `promised_on` date;--> statement-breakpoint
ALTER TABLE `transactions` ADD `method` enum('cash','bkash','nagad','rocket');--> statement-breakpoint
UPDATE `customers` c SET `last_entry_at` = (SELECT MAX(t.`created_at`) FROM `transactions` t WHERE t.`customer_id` = c.`id`);
