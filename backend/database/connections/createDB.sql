-- SQL script to create database tables 
-- Remove before submittion

CREATE TABLE "categories" (
  "categories_id" int NOT NULL AUTO_INCREMENT,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) DEFAULT NULL,
  "admin_id" int NOT NULL,
  "text_allow" int DEFAULT '1',
  "photo_allow" int DEFAULT '1',
  "description" mediumtext NOT NULL,
  PRIMARY KEY ("categories_id"),
  UNIQUE KEY "ux_categories_slug" ("slug"),
  KEY "admin_id" ("admin_id"),
  CONSTRAINT "categories_ibfk_1" FOREIGN KEY ("admin_id") REFERENCES "user" ("id")
);
CREATE TABLE "comment" (
  "comment_id" int NOT NULL AUTO_INCREMENT,
  "text" longtext NOT NULL,
  "created_at" datetime DEFAULT CURRENT_TIMESTAMP,
  "parent_id" int DEFAULT NULL,
  "author_id" int NOT NULL,
  "thread_id" int NOT NULL,
  "karma" int DEFAULT '0',
  PRIMARY KEY ("comment_id"),
  KEY "parent_id" ("parent_id"),
  KEY "author_id" ("author_id"),
  KEY "thread_id" ("thread_id"),
  FULLTEXT KEY "comment_text_fulltext" ("text"),
  CONSTRAINT "comment_ibfk_1" FOREIGN KEY ("parent_id") REFERENCES "comment" ("comment_id"),
  CONSTRAINT "comment_ibfk_2" FOREIGN KEY ("author_id") REFERENCES "user" ("id"),
  CONSTRAINT "comment_ibfk_3" FOREIGN KEY ("thread_id") REFERENCES "thread" ("thread_id")
);
CREATE TABLE "comment_reaction" (
  "comment_reaction_id" int NOT NULL AUTO_INCREMENT,
  "user_id" int NOT NULL,
  "comment_id" int NOT NULL,
  "value" tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY ("comment_reaction_id"),
  UNIQUE KEY "ux_comment_user" ("user_id","comment_id"),
  KEY "comment_id" ("comment_id"),
  CONSTRAINT "comment_reaction_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "user" ("id"),
  CONSTRAINT "comment_reaction_ibfk_2" FOREIGN KEY ("comment_id") REFERENCES "comment" ("comment_id")
);
CREATE TABLE "thread" (
  "thread_id" int NOT NULL AUTO_INCREMENT,
  "title" varchar(255) NOT NULL,
  "slug" varchar(255) DEFAULT NULL,
  "karma" int NOT NULL DEFAULT '0',
  "is_active" tinyint(1) DEFAULT NULL,
  "created_at" datetime DEFAULT CURRENT_TIMESTAMP,
  "category_id" int NOT NULL,
  "author_id" int NOT NULL,
  "deactivated_by" int DEFAULT NULL,
  "body_text" text NOT NULL,
  PRIMARY KEY ("thread_id"),
  UNIQUE KEY "ux_thread_slug" ("slug"),
  KEY "category_id" ("category_id"),
  KEY "author_id" ("author_id"),
  KEY "deactivated_by" ("deactivated_by"),
  FULLTEXT KEY "idx_thread_search" ("title","body_text"),
  CONSTRAINT "thread_ibfk_1" FOREIGN KEY ("category_id") REFERENCES "categories" ("categories_id"),
  CONSTRAINT "thread_ibfk_2" FOREIGN KEY ("author_id") REFERENCES "user" ("id"),
  CONSTRAINT "thread_ibfk_3" FOREIGN KEY ("deactivated_by") REFERENCES "user" ("id")
);

CREATE TABLE "thread_media" (
  "media_id" int NOT NULL AUTO_INCREMENT,
  "thread_id" int NOT NULL,
  "media_type" enum('image') NOT NULL DEFAULT 'image',
  "url" varchar(1024) NOT NULL,
  "public_id" varchar(255) DEFAULT NULL,
  PRIMARY KEY ("media_id"),
  KEY "thread_id" ("thread_id"),
  CONSTRAINT "fk_media_thread" FOREIGN KEY ("thread_id") REFERENCES "thread" ("thread_id") ON DELETE CASCADE
);
CREATE TABLE "thread_reaction" (
  "thread_reaction_id" int NOT NULL AUTO_INCREMENT,
  "user_id" int NOT NULL,
  "thread_id" int NOT NULL,
  "value" tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY ("thread_reaction_id"),
  UNIQUE KEY "ux_thread_reaction_user_thread" ("user_id","thread_id"),
  KEY "thread_id" ("thread_id"),
  CONSTRAINT "thread_reaction_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "user" ("id"),
  CONSTRAINT "thread_reaction_ibfk_2" FOREIGN KEY ("thread_id") REFERENCES "thread" ("thread_id")
);
CREATE TABLE "user" (
  "id" int NOT NULL AUTO_INCREMENT,
  "username" varchar(100) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "role_id" int DEFAULT '2',
  PRIMARY KEY ("id"),
  KEY "role_id" ("role_id"),
  CONSTRAINT "user_ibfk_1" FOREIGN KEY ("role_id") REFERENCES "user_type" ("id")
);
CREATE TABLE "user_type" (
  "id" int NOT NULL,
  "role" varchar(255) DEFAULT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "view_events" (
  "view_id" int NOT NULL AUTO_INCREMENT,
  "thread_id" int NOT NULL,
  "viewed_at" datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("view_id"),
  KEY "thread_id" ("thread_id"),
  CONSTRAINT "view_events_ibfk_1" FOREIGN KEY ("thread_id") REFERENCES "thread" ("thread_id")
);
