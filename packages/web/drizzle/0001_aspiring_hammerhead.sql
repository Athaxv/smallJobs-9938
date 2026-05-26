ALTER TABLE `posts` ADD `urgency` text DEFAULT 'today' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `expires_at` integer;--> statement-breakpoint
ALTER TABLE `posts` ADD `closed_at` integer;