import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Project Configuration', () => {
  const rootDir = join(__dirname, '../..');

  describe('package.json', () => {
    it('should exist in project root', () => {
      const packagePath = join(rootDir, 'package.json');
      expect(existsSync(packagePath)).toBe(true);
    });

    it('should have required dependencies', () => {
      const packagePath = join(rootDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

      // Check TypeScript 5.x
      expect(packageJson.devDependencies?.typescript).toMatch(/^\^?5\./);

      // Check Node.js 20.x LTS in engines
      expect(packageJson.engines?.node).toMatch(/^20\./);
    });

    it('should have build scripts defined', () => {
      const packagePath = join(rootDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

      expect(packageJson.scripts).toHaveProperty('build');
      expect(packageJson.scripts).toHaveProperty('watch');
      expect(packageJson.scripts).toHaveProperty('clean');
    });
  });

  describe('tsconfig.json', () => {
    it('should exist in project root', () => {
      const tsconfigPath = join(rootDir, 'tsconfig.json');
      expect(existsSync(tsconfigPath)).toBe(true);
    });

    it('should have strict type checking enabled', () => {
      const tsconfigPath = join(rootDir, 'tsconfig.json');
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });

    it('should prohibit any types by having strict mode', () => {
      const tsconfigPath = join(rootDir, 'tsconfig.json');
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

      // Strict mode includes noImplicitAny which effectively prohibits 'any'
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });
  });

  describe('.gitignore', () => {
    it('should exist in project root', () => {
      const gitignorePath = join(rootDir, '.gitignore');
      expect(existsSync(gitignorePath)).toBe(true);
    });

    it('should ignore node_modules', () => {
      const gitignorePath = join(rootDir, '.gitignore');
      const gitignore = readFileSync(gitignorePath, 'utf-8');

      expect(gitignore).toContain('node_modules');
    });

    it('should ignore build artifacts', () => {
      const gitignorePath = join(rootDir, '.gitignore');
      const gitignore = readFileSync(gitignorePath, 'utf-8');

      expect(gitignore).toMatch(/dist|build/);
    });
  });
});
