---
subject: You have been invited to {{ name }}
---

**{{ sender.display_name }}** invited you to join their team on {{ name }}.

{% include 'button', text: 'Accept invitation', url: action_url %}

This invitation was intended for {{ user.email }}. If you were not expecting this invitation, you can ignore this email.
