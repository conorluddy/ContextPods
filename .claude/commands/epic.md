# Epic Implementation Command

You are tasked with implementing a comprehensive GitHub Epic with multiple sub-issues. Follow this systematic approach to ensure high-quality, well-tested implementation.

## Parameters

- **Epic Issue Number**: The GitHub issue number for the main Epic (e.g., #86)

## Implementation Process

### Phase 1: Analysis & Planning

1. **Repository Analysis**: Use `@repo-analyzer` to thoroughly understand:
   - Current codebase architecture and patterns
   - Existing test coverage and patterns
   - Development workflows and conventions
   - Key dependencies and their usage patterns

2. **Epic Breakdown**: Analyze the Epic and all sub-issues to create a granular TODO list where each item:
   - Can be completed in 1-2 commits maximum
   - Has clear acceptance criteria
   - Includes specific test requirements
   - Follows atomic change principles

3. **Planning Considerations**:
   - Review current state vs Epic requirements
   - Identify dependencies between tasks
   - Plan commit strategy for incremental progress
   - Consider impact on existing functionality

### Phase 2: Implementation Standards

#### Code Quality Principles

- **Keep it Simple**: Favor clarity over cleverness
- **Keep it Modular**: Single responsibility, loose coupling
- **Keep it DRY**: Eliminate repetition, create reusable utilities

#### TypeScript Standards

- **Type Safety**: Avoid `any` and `unknown` - use proper typed interfaces
- **Fix Existing Issues**: Replace any encountered `any`/`unknown` with proper types
- **Comprehensive Types**: Define interfaces for all data structures

#### Documentation Requirements

- **Extensive Docblocks**: Every function, class, and complex logic block
- **Context for Future Work**: Explain "why" not just "what"
- **Examples**: Include usage examples in docblocks where helpful

#### Testing Requirements

- **>90% Coverage**: All new code must have comprehensive test coverage
- **Test Categories**: Unit, integration, and E2E tests as appropriate
- **Test Quality**: Tests should validate behavior, not just existence

### Phase 3: Execution Workflow

#### For Each TODO Item:

1. **Context Review**: Re-analyze current codebase state and completed items
2. **Implementation**: Code the specific feature/fix following standards
3. **Testing**: Write comprehensive tests achieving >90% coverage
4. **Validation**: Ensure all tests pass and no regressions
5. **Documentation**: Update docblocks and relevant docs
6. **Commit**: Make atomic commit with descriptive message

#### Commit Standards:

- **Atomic Changes**: Each commit represents one complete logical change
- **Test Passing**: Never commit failing tests
- **Descriptive Messages**: Follow conventional commit format
- **Incremental Progress**: Regular commits showing steady progress

#### Progress Tracking:

1. **GitHub Comments**: Update Epic issue with progress after each commit
2. **Checklist Updates**: Mark completed items and note current status
3. **PR Management**: Create PR after first commit, push subsequent commits
4. **Branch Strategy**: Use feature branch named `epic/issue-{number}`

### Phase 4: Quality Assurance

#### Before Each Commit:

- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] ESLint passing with no errors
- [ ] Test coverage >90% for new code
- [ ] Documentation complete

#### Epic Completion Criteria:

- [ ] All sub-issues implemented and tested
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] PR ready for review
- [ ] No regressions in existing functionality

## Command Usage

```bash
/epic 86
```

This will:

1. Analyze the repository using repo-analyzer
2. Break down Epic #86 into granular tasks
3. Begin systematic implementation
4. Create PR and track progress
5. Iterate until Epic is complete

## Success Metrics

- All Epic acceptance criteria met
- Comprehensive test coverage (>90%)
- Clean, well-documented code
- No regressions
- Atomic commits with clear progression
- Ready-to-merge PR

Remember: Quality over speed. Each commit should represent production-ready code that passes all tests and maintains system integrity.
