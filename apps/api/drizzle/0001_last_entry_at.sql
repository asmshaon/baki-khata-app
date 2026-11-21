ALTER TABLE `customers` ADD `last_entry_at` timestamp;--> statement-breakpoint
UPDATE `customers` c SET `last_entry_at` = (SELECT MAX(t.`created_at`) FROM `transactions` t WHERE t.`customer_id` = c.`id`);
