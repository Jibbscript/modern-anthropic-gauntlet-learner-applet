# Interview format notes (provisional)

Status: provisional. A fact-checked sweep of public candidate reports is in
progress and will replace this file. Until then, the only source is the
user-provided summary article (2026), which aggregates public reports from
Blind, Glassdoor, LeetCode Discuss and Reddit. Attribute everything here to
"candidates report" — none of it is official.

## Claims from the summary article

- The culture / values interview is the round candidates worry about most; described as unusually deep.
- Culture probes: what did you actually think at the time; how did you feel about the decision afterward; when have you disagreed with the direction of your company; have you faced an ethical conflict at work; what kind of work do you dislike doing; what happens when speed and safety conflict.
- Blindly agreeing with everything Anthropic believes is probably not a good strategy; the round seems designed to find out whether you have your own judgment, can explain it honestly, and can update when given a better argument. Different from memorizing STAR stories.
- Recruiter screen matters more than usual: why Anthropic specifically; how Anthropic differs from other AI labs; the biggest risks from advanced AI; where you personally disagree with the company. Generic "cutting-edge AI" answers are not enough.
- Coding is practical, not classic LeetCode. Reported questions: image-processing pipelines, concurrent web crawlers, stack-trace processing, caches, file deduplication, small instruction interpreters.
- Common structure: build something → make it work → extend it → make it concurrent / scalable → test it yourself.
- An image-processing question involves applying transformations to images, then discussing how to parallelize.
- The web-crawler question often starts simple and becomes a concurrency / thread-safety discussion.
- Knowing BFS and hash maps matters, but the harder parts are writing usable code, reading APIs, testing, debugging, and reasoning about concurrency.
- Some system design is done in a shared document rather than on a diagramming whiteboard. A reported prompt: design a Collaborative Prompt Playground (collaboration, versions, prompt execution, storage, scale). Written clarity matters.
- Anthropic's published candidate guidance says take-home assessments should be completed without AI unless instructions say otherwise. Newer formats reportedly experiment with agentic coding.
- Suggested prep focus: practical Python, concurrency, debugging unfamiliar code, reading library documentation quickly, testing your own implementation, explaining a real project deeply, forming actual opinions about AI safety and Anthropic's mission.
