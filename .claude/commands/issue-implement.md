# Issue Implementation Command

You are tasked with automatically implementing GitHub issues by creating branches, writing code, and opening pull requests with comprehensive solutions.

## Parameters

- **Issue Number**: The GitHub issue number to implement
- **Issue Context**: The finalized issue specifications and acceptance criteria
- **Trigger**: The implementation request (comment or label)

## Implementation Philosophy

**Quality First**: Every implementation must meet production standards with comprehensive testing, documentation, and adherence to repository conventions.

**Incremental Progress**: Build solutions step-by-step with atomic commits that can be reviewed and validated independently.

**Context Preservation**: Maintain connection to issue discussion, requirements, and user intent throughout implementation.

## Implementation Process

### Phase 1: Pre-Implementation Analysis

#### 1. Issue Specification Review

- **Requirements Analysis**: Parse and understand all acceptance criteria
- **Technical Specifications**: Review implementation approach and constraints
- **User Intent**: Understand the problem being solved and expected outcomes
- **Edge Cases**: Identify potential complications and error scenarios

#### 2. Repository Context Analysis

- **Architecture Understanding**: Analyze current codebase structure and patterns
- **Dependency Mapping**: Identify affected files, modules, and integrations
- **Convention Adherence**: Review coding standards, naming patterns, and best practices
- **Testing Framework**: Understand test structure and coverage expectations
- **Build System**: Analyze build process, quality gates, and CI/CD requirements

#### 3. Implementation Planning

- **Task Breakdown**: Create atomic, implementable tasks with clear success criteria
- **Dependency Ordering**: Sequence tasks to minimize conflicts and enable testing
- **File Structure**: Plan new files and modifications needed
- **Integration Points**: Identify where new code connects to existing systems
- **Testing Strategy**: Plan unit, integration, and E2E test requirements

### Phase 2: Branch and PR Setup

#### 1. Branch Creation

- **Naming Convention**: `issue-{number}-{descriptive-slug}`
  - Example: `issue-42-add-dark-mode-toggle`
- **Base Branch**: Always branch from main/master unless specified
- **Clean State**: Ensure working directory is clean before branching

#### 2. Draft PR Creation

- **Title Format**: `{type}: {description} (closes #{issue-number})`
  - Example: `feat: add dark mode toggle (closes #42)`
- **PR Description Template**:

```markdown
## 🚀 Auto-Implementation of Issue #{number}

### Issue Summary

{Brief summary of the issue and requirements}

### Implementation Plan

- [ ] {Task 1}
- [ ] {Task 2}
- [ ] {Task 3}
- [ ] Documentation updates
- [ ] Test coverage >90%
- [ ] Quality gates passing

### Technical Approach

{Overview of implementation strategy}

### Testing Strategy

{Description of testing approach}

### Progress Updates

{Real-time updates will be posted here as implementation progresses}

---

**Closes #{issue-number}**
🤖 Auto-implemented by Claude Code
```

### Phase 3: Iterative Implementation

#### 1. Development Cycle (Repeat for Each Task)

**A. Context Review**

- Re-analyze current state and completed work
- Review any new comments or requirements on the issue
- Ensure understanding of current task requirements

**B. Implementation**

- Write clean, well-documented code following repository patterns
- Follow existing code style, naming conventions, and architecture
- Handle edge cases and error scenarios appropriately
- Add comprehensive JSDoc/docblock comments explaining logic

**C. Testing**

- Write unit tests for all new functions and components
- Create integration tests for feature interactions
- Add E2E tests for complete user workflows
- Achieve >90% code coverage for new code
- Ensure all existing tests continue passing

**D. Documentation**

- Update relevant documentation files
- Add inline code comments for complex logic
- Update README if new features are user-facing
- Document configuration changes or new dependencies

**E. Quality Validation**

- Run all tests and ensure 100% pass rate
- Execute linting and fix all issues
- Perform type checking and resolve type errors
- Run build process and ensure success
- Verify no regressions in existing functionality

**F. Atomic Commit**

- Stage only files related to current task
- Write descriptive commit message following conventional commit format
- Example: `feat(ui): add dark mode toggle component with accessibility support`
- Include issue reference in commit body

#### 2. Progress Tracking

- Update PR description with completed tasks ✅
- Post progress comments on both issue and PR
- Include relevant code snippets or screenshots for visual changes
- Mention any discovered complexities or implementation decisions

### Phase 4: Completion and Review Preparation

#### 1. Final Validation

- **Acceptance Criteria**: Verify all issue requirements are met
- **Test Coverage**: Ensure >90% coverage maintained
- **Documentation**: Confirm all docs are updated and accurate
- **Performance**: Verify no performance regressions
- **Security**: Check for security vulnerabilities or data exposure
- **Accessibility**: Ensure new UI elements meet accessibility standards

#### 2. PR Finalization

- Mark PR as ready for review (remove draft status)
- Update PR description with final implementation summary
- Add detailed testing instructions for reviewers
- Include screenshots/videos for UI changes
- Link any additional context or design decisions

#### 3. Issue Communication

- Post completion comment on original issue with PR link
- Summarize what was implemented and how it addresses the requirements
- Include testing instructions for the issue author
- Thank for the clear requirements and specify next steps

## Implementation Standards

### Code Quality Requirements

- **TypeScript**: Use proper typing, avoid `any`, define interfaces for data structures
- **Testing**: >90% coverage with meaningful tests that validate behavior
- **Documentation**: Comprehensive JSDoc/docblocks for all public interfaces
- **Error Handling**: Proper error handling with user-friendly messages
- **Performance**: Optimize for performance, avoid unnecessary re-renders or computations
- **Security**: Follow security best practices, validate inputs, sanitize outputs

### Repository Integration

- **Patterns**: Follow existing code patterns and architectural decisions
- **Dependencies**: Only add necessary dependencies, prefer existing solutions
- **Configuration**: Update configuration files appropriately
- **Build System**: Ensure compatibility with existing build and deployment processes
- **Git Hygiene**: Clean commit history with descriptive messages

### Communication Standards

- **Progress Updates**: Regular updates on both issue and PR
- **Decision Documentation**: Explain non-obvious implementation decisions
- **Problem Resolution**: Document how blocking issues were resolved
- **Review Facilitation**: Make it easy for reviewers to understand and test changes

## Command Execution Workflow

The implementation workflow will:

1. **Initialize**: Create branch and draft PR with implementation plan
2. **Analyze**: Deep dive into issue requirements and repository context
3. **Plan**: Break down implementation into atomic tasks
4. **Implement**: Iteratively build solution with tests and documentation
5. **Validate**: Ensure quality gates pass and requirements are met
6. **Finalize**: Prepare PR for review and communicate completion

### Key Tools and Commands

- `git checkout -b issue-{number}-{slug}` - Branch creation
- `gh pr create --draft` - Draft PR creation
- `gh pr edit` - PR description updates
- `gh issue comment` - Progress updates
- `npm test`, `npm run lint`, `npm run build` - Quality validation
- `git commit -m "conventional-commit-message"` - Atomic commits

## Success Criteria

### Implementation Success

- ✅ All issue acceptance criteria met
- ✅ >90% test coverage maintained
- ✅ All quality gates passing (tests, lint, build, type-check)
- ✅ No regressions in existing functionality
- ✅ Clean, well-documented code following repository patterns
- ✅ Comprehensive testing at unit, integration, and E2E levels

### Process Success

- ✅ Clear communication and progress tracking
- ✅ Atomic commits with descriptive messages
- ✅ Draft PR → Ready for Review workflow followed
- ✅ Issue properly linked and will auto-close on merge
- ✅ Reviewers have clear context and testing instructions

### Quality Success

- ✅ Code follows repository conventions and best practices
- ✅ Documentation is comprehensive and up-to-date
- ✅ Error handling is robust and user-friendly
- ✅ Performance is optimized and measured
- ✅ Security considerations are addressed

## Error Handling and Recovery

### Build Failures

- Analyze error messages and identify root cause
- Implement fix and validate with tests
- Update progress with explanation of issue and resolution

### Test Failures

- Review failing tests to understand expectations
- Fix implementation or update tests as appropriate
- Ensure no test coverage is lost

### Quality Gate Failures

- Address linting, type checking, and formatting issues
- Follow repository standards for code quality
- Re-run validation until all gates pass

### Merge Conflicts

- Analyze conflicts and understand competing changes
- Resolve conflicts preserving both sets of changes when possible
- Test thoroughly after conflict resolution

Remember: The goal is to produce production-ready code that fully addresses the issue requirements while maintaining the highest standards of quality, testing, and documentation. Every implementation should feel like it was carefully crafted by an experienced developer who deeply understands both the requirements and the codebase.
