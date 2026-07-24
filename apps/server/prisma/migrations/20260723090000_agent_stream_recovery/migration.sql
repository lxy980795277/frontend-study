-- CreateTable
CREATE TABLE `t_threads` (
    `id` CHAR(36) NOT NULL COMMENT 'UUIDv7 线程标识',
    `title` VARCHAR(120) NULL COMMENT '线程标题',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC 创建时间',
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC 更新时间',

    INDEX `idx_threads_updated_at_id`(`updated_at`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Agent 对话线程';

-- CreateTable
CREATE TABLE `t_agent_runs` (
    `id` CHAR(36) NOT NULL COMMENT 'AG-UI runId，UUIDv7',
    `thread_id` CHAR(36) NOT NULL COMMENT '所属线程',
    `input_hash` CHAR(64) NOT NULL COMMENT '规范化 RunAgentInput 的 SHA-256',
    `input_snapshot` JSON NOT NULL COMMENT '完整 RunAgentInput 快照',
    `status` VARCHAR(24) NOT NULL COMMENT 'PENDING/RUNNING/CANCELLING/SUCCEEDED/FAILED/ABORTED',
    `error_code` VARCHAR(64) NULL COMMENT '稳定错误码',
    `error_message` VARCHAR(512) NULL COMMENT '脱敏错误信息',
    `started_at` DATETIME(3) NULL COMMENT 'Producer 启动时间',
    `finished_at` DATETIME(3) NULL COMMENT 'Run 终态时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC 创建时间',
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC 更新时间',

    INDEX `idx_agent_runs_thread_status_created`(`thread_id`, `status`, `created_at`),
    INDEX `idx_agent_runs_status_updated`(`status`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AG-UI Agent Run';

-- CreateTable
CREATE TABLE `t_messages` (
    `id` CHAR(36) NOT NULL COMMENT 'AG-UI messageId，UUIDv7',
    `thread_id` CHAR(36) NOT NULL COMMENT '所属线程',
    `run_id` CHAR(36) NOT NULL COMMENT '产生或触发消息的 Run',
    `role` VARCHAR(20) NOT NULL COMMENT 'AG-UI Message Role',
    `payload` JSON NOT NULL COMMENT '完整 AG-UI Message JSON',
    `status` VARCHAR(24) NOT NULL COMMENT 'COMPLETED/INTERRUPTED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC 创建时间',
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC 更新时间',

    INDEX `idx_messages_thread_created_id`(`thread_id`, `created_at`, `id`),
    INDEX `idx_messages_run_created`(`run_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '持久化后的紧凑 AG-UI Message';

-- AddForeignKey
ALTER TABLE `t_agent_runs`
    ADD CONSTRAINT `fk_agent_runs_thread`
    FOREIGN KEY (`thread_id`) REFERENCES `t_threads`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_messages`
    ADD CONSTRAINT `fk_messages_thread`
    FOREIGN KEY (`thread_id`) REFERENCES `t_threads`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_messages`
    ADD CONSTRAINT `fk_messages_run`
    FOREIGN KEY (`run_id`) REFERENCES `t_agent_runs`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
