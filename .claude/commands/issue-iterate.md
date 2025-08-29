# Issue Iteration Command

You are tasked with iterating and evolving GitHub issue specifications based on user reactions and feedback through interactive comment-based refinement.

## Parameters

- **Issue Number**: The GitHub issue number being iterated
- **Trigger Type**: The type of iteration requested (reaction emoji or chat)
- **Context**: Previous comments, reactions, and iteration history

## Iteration Types

### 🔄 Refine Mode

**Purpose**: Incremental improvement and clarification of existing specifications
**Approach**:

- Polish existing requirements for clarity and completeness
- Fill in gaps or ambiguities in the current specification
- Improve technical details and implementation guidance
- Enhance acceptance criteria specificity

### 🦖 Evolve Mode

**Purpose**: Creative expansion and significant enhancement of the idea
**Approach**:

- Explore creative extensions and related features
- Consider broader implications and opportunities
- Suggest complementary functionality
- Think outside the box while maintaining feasibility

### 💬 Chat Mode

**Purpose**: General discussion and Q&A about the issue
**Approach**:

- Answer specific questions about implementation
- Provide clarifications on technical aspects
- Discuss alternative approaches
- Address concerns or suggestions

## Iteration Process

### Phase 1: Context Analysis

1. **Issue History Review**: Analyze the complete issue thread including:
   - Original issue description and enhancement
   - All previous comments and iterations
   - Reaction patterns and feedback signals
   - Evolution of the idea over time

2. **Current State Assessment**: Understand:
   - What aspects are well-defined vs. unclear
   - Which requirements need refinement
   - What gaps exist in the specification
   - User feedback patterns and preferences

3. **Repository Context**: Consider:
   - Recent repository changes since last iteration
   - New patterns or conventions that may apply
   - Updated dependencies or architectural changes
   - Related issues or PRs that provide context

### Phase 2: Iteration Strategy

#### For 🔄 Refine Mode:

- **Clarity Enhancement**: Improve unclear or ambiguous language
- **Detail Addition**: Add missing technical specifications
- **Consistency Check**: Ensure alignment with repository standards
- **Completeness Review**: Fill gaps in requirements or acceptance criteria

#### For 🦖 Evolve Mode:

- **Feature Expansion**: Explore natural extensions and improvements
- **Integration Opportunities**: Consider how this connects to broader goals
- **Future-Proofing**: Think about scalability and extensibility
- **Creative Enhancement**: Suggest innovative approaches or features

#### For 💬 Chat Mode:

- **Direct Response**: Address specific questions or comments
- **Technical Guidance**: Provide implementation insights
- **Alternative Discussion**: Explore different approaches
- **Problem Solving**: Help work through challenges

### Phase 3: Response Generation

#### Comment Format:

```markdown
## 🔄/🦖/💬 Issue Iteration

_Iteration based on [trigger description] - [timestamp]_

### [Iteration Focus Area]

[Specific improvements/changes/responses]

### Key Changes

- [Bullet point of major changes]
- [Another key change]

### Next Steps

[Suggested next actions or questions for further iteration]

---

_React with ⭐️ to replace the main issue description with this iteration_
```

## Command Execution

The workflow will:

1. **Analyze Context**: Use `gh issue view` and `gh api` to get issue details and reactions
2. **Review History**: Read all comments and previous iterations
3. **Determine Mode**: Based on reaction emoji that triggered the iteration
4. **Generate Response**: Create appropriate iteration as issue comment
5. **Post Comment**: Use `gh issue comment` to add the iteration

## Special Behaviors

### ⭐️ Star Reaction Handler

When a comment receives a ⭐️ reaction:

1. Extract the comment content
2. Replace the main issue description with the starred iteration
3. Add metadata noting the iteration history
4. Preserve original content in a collapsed details section

### Context Preservation

- Always reference previous iterations in new responses
- Build incrementally on established requirements
- Maintain consistency with repository patterns and conventions
- Track evolution of ideas across iterations

## Quality Standards

- **Incremental Value**: Each iteration should add meaningful value
- **Clarity**: Improvements should increase understanding, not confusion
- **Actionability**: All suggestions should be implementable
- **Consistency**: Maintain alignment with repository standards and patterns
- **Engagement**: Encourage further iteration and refinement

## Success Criteria

- Issue specifications become progressively more refined and complete
- User can easily track the evolution of ideas through comment history
- Final specifications (after ⭐️) are comprehensive and implementable
- Interactive process feels natural and productive
- Repository context is maintained throughout iterations

Remember: The goal is collaborative refinement. Each iteration should feel like a natural conversation that moves the issue specification toward an optimal, implementable state.
