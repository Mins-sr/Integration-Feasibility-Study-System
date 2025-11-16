/**
 * Checkpoint Manager
 *
 * Manages checkpoint persistence for long-running studies
 */

import { writeFile, readFile, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import type { Result, StudyError, AnalyzerResult } from '@/types';
import { ok, err } from '@/types';

/**
 * Study Checkpoint
 *
 * Contains the state of a study at a specific point in time
 */
export interface StudyCheckpoint {
  readonly studyId: string;
  readonly createdAt: Date;
  readonly completedAnalyzers: string[];
  readonly results: AnalyzerResult[];
  readonly errors: StudyError[];
  readonly config: unknown;
}

/**
 * Checkpoint Manager Service
 *
 * Responsible for:
 * - Saving study checkpoints to filesystem
 * - Loading checkpoints for resume functionality
 * - Validating checkpoint integrity
 * - Cleaning up completed checkpoints
 */
export class CheckpointManager {
  private readonly checkpointDir: string;

  constructor(checkpointDir: string = '.study-checkpoint') {
    this.checkpointDir = checkpointDir;
  }

  /**
   * Save checkpoint to filesystem
   *
   * @param checkpoint - Study checkpoint to save
   * @returns Result indicating success or error
   */
  async saveCheckpoint(checkpoint: StudyCheckpoint): Promise<Result<void, StudyError>> {
    try {
      // Ensure checkpoint directory exists
      await mkdir(this.checkpointDir, { recursive: true });

      const filePath = this.getCheckpointPath(checkpoint.studyId);
      const content = JSON.stringify(checkpoint, null, 2);

      await writeFile(filePath, content, 'utf-8');

      return ok(undefined);
    } catch (error) {
      return err({
        type: 'REPORT_GENERATION_FAILED',
        cause: error as Error,
      });
    }
  }

  /**
   * Load checkpoint from filesystem
   *
   * @param studyId - Study ID
   * @returns Result with StudyCheckpoint or error
   */
  async loadCheckpoint(studyId: string): Promise<Result<StudyCheckpoint, StudyError>> {
    try {
      const filePath = this.getCheckpointPath(studyId);
      const content = await readFile(filePath, 'utf-8');
      const checkpoint = JSON.parse(content) as StudyCheckpoint;

      // Validate checkpoint integrity
      const validationResult = this.validateCheckpoint(checkpoint);
      if (!validationResult.success) {
        return validationResult;
      }

      return ok(checkpoint);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return err({
          type: 'CONFIG_INVALID',
          message: `Checkpoint not found for study: ${studyId}`,
          field: 'studyId',
        });
      }

      return err({
        type: 'CONFIG_INVALID',
        message: `Failed to load checkpoint: ${(error as Error).message}`,
        field: 'checkpoint',
      });
    }
  }

  /**
   * Delete checkpoint file
   *
   * @param studyId - Study ID
   * @returns Result indicating success or error
   */
  async deleteCheckpoint(studyId: string): Promise<Result<void, StudyError>> {
    try {
      const filePath = this.getCheckpointPath(studyId);
      await unlink(filePath);
      return ok(undefined);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return ok(undefined);
      }

      return err({
        type: 'REPORT_GENERATION_FAILED',
        cause: error as Error,
      });
    }
  }

  /**
   * Validate checkpoint integrity
   *
   * @param checkpoint - Checkpoint to validate
   * @returns Result indicating validity
   */
  private validateCheckpoint(checkpoint: unknown): Result<StudyCheckpoint, StudyError> {
    if (typeof checkpoint !== 'object' || checkpoint === null) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'Checkpoint must be an object',
        field: 'checkpoint',
      });
    }

    const cp = checkpoint as Record<string, unknown>;

    if (!cp.studyId || typeof cp.studyId !== 'string') {
      return err({
        type: 'CONFIG_INVALID',
        message: 'Checkpoint must have a valid studyId',
        field: 'checkpoint.studyId',
      });
    }

    if (!Array.isArray(cp.completedAnalyzers)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'Checkpoint must have completedAnalyzers array',
        field: 'checkpoint.completedAnalyzers',
      });
    }

    if (!Array.isArray(cp.results)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'Checkpoint must have results array',
        field: 'checkpoint.results',
      });
    }

    return ok(checkpoint as StudyCheckpoint);
  }

  /**
   * Get checkpoint file path
   *
   * @param studyId - Study ID
   * @returns File path for checkpoint
   */
  private getCheckpointPath(studyId: string): string {
    return join(this.checkpointDir, `${studyId}.json`);
  }
}
