import type { Messages } from './en';
import type { IssueMessage } from '../domain/types';

/**
 * Turn a parser-generated issue code into wording, in the active language.
 *
 * The catalogue's `issueMessages` map is exactly typed — each entry accepts only its
 * own message shape — but TypeScript cannot see that `t.issueMessages[m.id]` and `m`
 * come from the same union member, so the lookup is widened once, here, rather than at
 * every call site. `IssueRenderers` in `en.ts` is what keeps the individual entries
 * honest; a new message id is still a compile error until every language handles it.
 */
export function renderIssue(t: Messages, message: IssueMessage): { title: string; detail: string } {
  const render = t.issueMessages[message.id] as (params: IssueMessage) => { title: string; detail: string };
  return render(message);
}
