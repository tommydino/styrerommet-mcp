# Styrerommet Plus

> [!WARNING]
> Experimental, unofficial MCP server, not affiliated with OBOS. Use at your own risk. Review and manually approve every tool call, including the data it shares and any changes it makes.

An extended fork of [Styrerommet MCP](https://github.com/AudunWA/styrerommet-mcp) for board workflows with Styrerommet, Vibbo, Cantor, Arkiv and OBOS Mitt Bygg. Read meetings, residents, invoices, accounts and documents; manage suppliers, HMS deviations and maintenance; edit unpublished Vibbo handbook drafts. Mitt Bygg tools are optional and only need a separate sign-in for cooperatives that use Mitt Bygg.

## Install

You need an OBOS account with access to your cooperative and **Chrome or Edge** for sign-in. For Claude Desktop, use the [desktop bundle](#claude-desktop). Other clients need [Node.js 24+](https://nodejs.org/).

Sign in before connecting an npm-based client:

```sh
npx --yes styrerommet-plus@latest --auth
```

Choose **Vipps** and enable **“Remember me in this browser”** for faster reauthentication. Wait for the terminal to confirm sign-in. Your cooperative is detected automatically, and clients share the saved login on your computer. Run the same command to sign in again. The server uses your installed browser; no browser download or API key is needed.

## Optional Styrerommet email search

Email access is separate from the normal OBOS sign-in. On macOS, run the local setup once:

```sh
npx --yes styrerommet-plus@latest --email-setup
```

The wizard defaults to `imap.styrerommet.no`, port `993` and TLS. It tests the connection before finishing. The email password is stored in **macOS Keychain**, while the non-secret server settings are stored with owner-only permissions in `~/.config/styrerommet-plus/email.json`. The password is never written to GitHub, the MCP configuration or a project `.env` file.

Useful maintenance commands:

```sh
npx --yes styrerommet-plus@latest --email-test
npx --yes styrerommet-plus@latest --email-remove
```

The email tools are read-only:

- `email_status` checks local configuration and can test the connection.
- `search_emails` searches sender, recipients, subject and message text.
- `search_email_contracts` searches for contracts and agreements, optionally combined with supplier or project words.

Results may contain confidential correspondence and personal information. Retrieve only what is necessary and do not share results outside the board's authorized systems.

## Optional Mitt Bygg

Mitt Bygg is not available to every OBOS cooperative. The normal sign-in above deliberately skips it, so Styrerommet, Arkiv and Vibbo work without a Mitt Bygg account.

Only connect Mitt Bygg when the cooperative uses the service and you need a Mitt Bygg tool:

```sh
npx --yes styrerommet-plus@latest --auth mittbygg
```

In an AI client, call `login_interactive` with `service: "mittbygg"` for that separate sign-in. Its default is `service: "standard"`, which never attempts Mitt Bygg. If Mitt Bygg is unavailable, continue with the other tools; it does not block meetings, documents, finance, suppliers, Arkiv or Vibbo.

## Clients

### ChatGPT Desktop

1. Open **Settings → MCP servers → Add server**.
2. Choose **STDIO** and enter:

   | Field | Value |
   | --- | --- |
   | Name | `styrerommet-plus` |
   | Command | `npx` |
   | Arguments | `--yes`, `styrerommet-plus@latest` (two arguments) |

3. Save, then select **Restart**. Type `/mcp` in the composer to confirm the connection.

If ChatGPT Desktop cannot find `npx` on an Apple Silicon Mac with Homebrew, use its absolute path as the command:

```text
/opt/homebrew/bin/npx
```

Keep the arguments unchanged: `--yes` and `styrerommet-plus@latest`. On Intel Macs or other installations, find the correct path with `command -v npx`.

Use a chat running on your local computer. Workspace policies may restrict local servers. [Official setup](https://learn.chatgpt.com/docs/extend/mcp#configure-in-the-chatgpt-desktop-app).

### Claude Desktop

[Download the desktop bundle](https://github.com/tommydino/styrerommet-mcp/releases/latest/download/styrerommet-plus.mcpb), then:

1. Open **Settings → Desktop app → Extensions → Manage → Advanced settings → Install Extension…** and select the `.mcpb` file.
2. Start a chat and ask: “Sign in to Styrerommet using `login_interactive`.” Use the Vipps and “Remember me” options described above.

The bundle includes the server and its dependencies. Claude's Node runtime must support **Node.js 24+**; otherwise use the manual setup below. To update, install the latest bundle from the same link. Styrerommet Plus can be installed alongside the original because it uses its own extension identity. [Official setup](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).


#### Configure email for the Claude Desktop bundle

The MCPB bundle runs locally as your macOS user, so it uses the same email configuration and macOS Keychain entry as the command-line version. After installing or updating the bundle, configure email once in Terminal:

```sh
npx --yes styrerommet-plus@0.1.7 --email-setup
```

Enter the Styrerommet email address and email password. Press Enter to accept the defaults `imap.styrerommet.no`, port `993` and TLS. Password input is hidden and the password is stored only in **macOS Keychain** under the service `styrerommet-plus-email`. Non-secret settings are stored in `~/.config/styrerommet-plus/email.json`.

Verify the connection:

```sh
npx --yes styrerommet-plus@0.1.7 --email-test
```

Fully quit and reopen Claude Desktop afterwards. Claude will then have the read-only tools `email_status`, `search_emails` and `search_email_contracts`. Never paste the email password into Claude, an MCP configuration file, GitHub or a project `.env` file. macOS may ask for permission to access the Keychain item the first time Claude uses email search.

Normal Styrerommet, Arkiv and Vibbo sign-in remains separate and can be started with `login_interactive` or:

```sh
npx --yes styrerommet-plus@0.1.7 --auth
```

<details>
<summary>Manual setup with Node.js 24+ and npm</summary>

Open **Settings → Developer → Edit Config** and merge this into `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "styrerommet-plus": {
      "command": "npx",
      "args": ["--yes", "styrerommet-plus@latest"]
    }
  }
}
```

Configuration file: `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, or `%APPDATA%\Claude\claude_desktop_config.json` on Windows. Save, fully quit Claude, and reopen it. [Manual setup guide](https://modelcontextprotocol.io/docs/develop/connect-local-servers).

</details>

### Codex

```sh
codex mcp add styrerommet-plus -- npx --yes styrerommet-plus@latest
```

Local Codex clients and ChatGPT Desktop share MCP configuration on the same host. [Official setup](https://learn.chatgpt.com/docs/extend/mcp#configure-with-the-cli).

### Claude Code

```sh
claude mcp add --scope user --transport stdio styrerommet-plus -- npx --yes styrerommet-plus@latest
```

[Official setup](https://code.claude.com/docs/en/mcp#option-3-add-a-local-stdio-server).

Once connected, try: “Show my organization and upcoming board meetings.” Restart your client or MCP server to pick up updates.

<details>
<summary>Troubleshooting</summary>

- Check that `node --version` reports 24 or newer, and run the sign-in command in a terminal first.
- If a desktop app cannot find `npx`, use its absolute path (`command -v npx` on macOS/Linux, `where npx` on Windows), then restart the app.
- If `npx` fails to launch on Windows, use command `cmd` with arguments `["/c", "npx", "--yes", "styrerommet-plus@latest"]`. For CLI setup, put `cmd /c npx --yes styrerommet-plus@latest` after `--`.

</details>

## Privacy, GDPR and service terms

The server runs locally, but tool results go to your AI client and may be sent to its model provider. They can contain residents' personal details, financial records and confidential board documents.

Confirm your cooperative authorizes this use and has a GDPR legal basis. Retrieve only what is needed and anonymize where possible. Assess your AI provider's retention, model training, transfers outside the EEA and need for a data processing agreement. Account access alone does not authorize onward disclosure.

Follow [Styrerommet's terms](https://styrerommet.no/bruksvilkar), [Vibbo's terms and privacy notice](https://vibbo.no/personvernerklaering), [OBOS's group privacy notice](https://www.obos.no/om-obos/personvern) and [OBOS Eiendomsforvaltning's privacy notice](https://www.obos.no/om-obos/personvern/personvernerklaring-for-obos-eiendomsforvaltning-as), plus your AI provider's terms. The MIT license covers the code, not permission to use or disclose service data.

## Credentials

Credentials and a dedicated browser profile are stored locally under `styrerommet-plus` in your application-data directory: `~/Library/Application Support` on macOS, `%LOCALAPPDATA%` on Windows, or `${XDG_DATA_HOME:-~/.local/share}` on Linux. Credentials are **plaintext**, with owner-only permissions on POSIX. Protect this directory and never share it.

For optional settings, see [.env.example](https://github.com/tommydino/styrerommet-mcp/blob/main/.env.example). `STYREROMMET_ENV_PATH` overrides the credential file; project `.env` files are not loaded automatically. Mitt Bygg is optional: use `--auth mittbygg` only if your cooperative uses it, or `NO_AUTO_LOGIN=true` to prevent automatic browser prompts.

## Tools

**Read** tools retrieve information. **Write** tools change real records or save local files and credentials. Uploads and downloads use your OS file permissions. Vibbo topic edits remain unpublished drafts.

<details>
<summary>Show all 140 tools</summary>

| Name | Description |
| --- | --- |
| `add_attachment_to_hms_deviation` | **Write** — Upload and attach a file to a deviation. |
| `add_supplier_contact` | **Write** — Add a supplier contact. |
| `add_supplier_contract` | **Write** — Create a supplier contract. |
| `add_supplier_contract_attachment` | **Write** — Link an uploaded attachment to a contract. |
| `add_supplier_document` | **Write** — Link an uploaded document to a supplier. |
| `analyze_apartment` | **Read** — Ownership, occupancy, area and shared costs for a unit. |
| `analyze_maintenance_financing` | **Read** — Assess maintenance financing using Mitt Bygg plans and Cantor figures. |
| `analyze_supplier_costs` | **Read** — Summarize spending and invoice counts by supplier. |
| `cantor_get_account_comments` | **Read** — Accountant and board comments on accounts. |
| `cantor_get_budget` | **Read** — Annual and monthly budgets, prior figures and lock status. |
| `cantor_get_budget_specifications` | **Read** — Budget line items for an account. |
| `cantor_get_chart_of_accounts` | **Read** — The cooperative's chart of accounts. |
| `cantor_get_company_info` | **Read** — Cantor company details and available reporting periods. |
| `cantor_get_dashboard_summary` | **Read** — Income, costs, results, budget variance and liquidity. |
| `cantor_get_dimensions` | **Read** — Accounting dimensions configured in Cantor. |
| `cantor_get_felleskostnader_forecast` | **Read** — Forecasts and recommended increases in common charges. |
| `cantor_get_monthly_actuals` | **Read** — Monthly actuals, rolling totals and year-to-date figures. |
| `cantor_get_trial_balance` | **Read** — Account balances, comparisons and forecasts. |
| `cantor_list_dashboard_widgets` | **Read** — Available financial dashboard widgets and reports. |
| `create_hms_deviation` | **Write** — Create a health and safety deviation, optionally with attachments. |
| `delete_hms_deviation` | **Write** — Delete a health and safety deviation. |
| `download_archive_file` | **Write** — Save an archive file locally. |
| `download_archive_zip` | **Write** — Save an archive folder or collection as a local ZIP file. |
| `download_document` | **Write** — Save a Styrerommet or Vibbo document to a local file. |
| `download_invoices` | **Write** — Save invoice attachment PDFs to local files. |
| `get_announcements` | **Read** — Styrerommet news and dashboard announcements. |
| `get_archive_file_details` | **Read** — Metadata for an archive file or folder. |
| `get_archive_file_revisions` | **Read** — An archive file's previous versions and metadata. |
| `get_audit_logs` | **Read** — The cooperative's activity and change log. |
| `email_status` | **Read** — Check local email configuration and optionally test IMAP. |\n| `get_economy` | **Read** — Bank accounts, balances, loans and finance contacts. |
| `get_expense` | **Read** — Details of an out-of-pocket expense. |
| `get_general_assembly` | **Read** — Details of a general assembly. |
| `get_hms_overview` | **Read** — Health and safety routines, risks and deviations. |
| `get_insurance_case` | **Read** — An insurance claim, messages and affected residents. |
| `get_insurance_overview` | **Read** — Insurance policies, documents and claims. |
| `get_invoice` | **Read** — Invoice details, attachments and comments. |
| `get_loan_repayment_plan` | **Read** — Loan repayment and amortization schedules. |
| `get_maintenance_project` | **Read** — Details of a building or maintenance project. |
| `get_meeting` | **Read** — Meeting agenda, attendees and minutes. |
| `get_meeting_issue` | **Read** — An agenda item's description, decisions, history and attachments. |
| `get_operation_schema` | **Read** — A Styrerommet query's fields and parameters. |
| `get_other_object_details` | **Read** — Details of a non-apartment property unit. |
| `get_resident_contact_details` | **Read** — A resident's contact details, roles and communication consents. |
| `get_sms_dispatches` | **Read** — Sent SMS messages and delivery statistics. |
| `get_supplier_details` | **Read** — A supplier's spending, contracts and contacts. |
| `get_task_details` | **Read** — A board task's description, assignments and attachments. |
| `get_transactions` | **Read** — Transactions for a bank account. |
| `get_viewer` | **Read** — Current user, cooperative, roles and permissions. |
| `graphql` | **Read** — Run a cataloged read-only Styrerommet GraphQL query. |
| `list_active_invoices` | **Read** — Invoices awaiting approval in Semine. |
| `list_apartments` | **Read** — Apartment numbers, areas, rooms and shared costs. |
| `list_archive_files` | **Read** — Arkiv files and folders. |
| `list_board_tasks` | **Read** — Active or completed board tasks. |
| `list_documents` | **Read** — Shared documents from Styrerommet and Vibbo. |
| `list_expenses` | **Read** — Out-of-pocket expenses, payees, status and amounts. |
| `list_general_assemblies` | **Read** — Annual meetings and general assemblies. |
| `list_maintenance_projects` | **Read** — Building and maintenance projects, costs and status. |
| `list_meeting_issues` | **Read** — Board meeting agenda items and cases. |
| `list_meetings` | **Read** — Board meetings, dates and signing status. |
| `list_operations` | **Read** — Available read-only Styrerommet GraphQL operations. |
| `list_other_objects` | **Read** — Commercial units, storage rooms and parking spaces. |
| `list_planned_meetings` | **Read** — Upcoming board meetings. |
| `list_residents` | **Read** — Combined resident information from Styrerommet and Vibbo. |
| `list_supplier_contracts` | **Read** — Supplier contracts and renewal dates. |
| `list_suppliers` | **Read** — Suppliers, contact information and categories. |
| `login_interactive` | **Write** — Open browser sign-in and save session credentials locally. |
| `mittbygg_add_building_part_history` | **Write** — Record completed maintenance or rehabilitation. |
| `mittbygg_assign_task` | **Write** — Assign or unassign a maintenance task. |
| `mittbygg_create_measure` | **Write** — Add a board maintenance measure to the plan. |
| `mittbygg_create_measure_from_recommendation` | **Write** — Turn a recommendation into a planned maintenance measure. |
| `mittbygg_create_task` | **Write** — Create a board maintenance task. |
| `mittbygg_delete_building_part_history` | **Write** — Delete a maintenance history entry. |
| `mittbygg_delete_document` | **Write** — Delete a building document and its metadata. |
| `mittbygg_delete_measure` | **Write** — Delete a board-created maintenance measure. |
| `mittbygg_dismiss_recommendation` | **Write** — Dismiss an automated maintenance recommendation. |
| `mittbygg_get_building_part_details` | **Read** — A building component's condition and maintenance details. |
| `mittbygg_get_building_parts` | **Read** — Building components and their condition status. |
| `mittbygg_get_company_info` | **Read** — Property and building master data from OBOS and Kartverket. |
| `mittbygg_get_condition` | **Read** — Condition scores, urgent issues and remaining component lifespans. |
| `mittbygg_get_condition_report` | **Read** — The building condition report and inspection findings. |
| `mittbygg_get_documents` | **Read** — Building and maintenance documents. |
| `mittbygg_get_maintenance_plan` | **Read** — Planned maintenance, recommendations and historical work. |
| `mittbygg_get_overview` | **Read** — Property condition and maintenance summary. |
| `mittbygg_get_tasks` | **Read** — Operational maintenance tasks and board assignments. |
| `mittbygg_reactivate_recommendation` | **Write** — Reactivate a dismissed recommendation. |
| `mittbygg_set_building_part_relevance` | **Write** — Mark a building component as relevant or irrelevant. |
| `mittbygg_update_building_name` | **Write** — Change or reset a building's display name. |
| `mittbygg_update_building_part_history` | **Write** — Update a maintenance history entry. |
| `mittbygg_update_document` | **Write** — Update building document metadata. |
| `mittbygg_update_measure` | **Write** — Update a maintenance measure's scope, schedule, cost or status. |
| `mittbygg_update_task` | **Write** — Update a maintenance task's status, comments or year. |
| `mittbygg_upload_document` | **Write** — Upload a building document with optional analysis and metadata. |
| `read_archive_file` | **Read** — Read archive document text into memory. |
| `remove_supplier_contact` | **Write** — Delete a supplier contact. |
| `remove_supplier_contract` | **Write** — Delete a supplier contract. |
| `remove_supplier_contract_attachment` | **Write** — Remove an attachment link from a contract. |
| `remove_supplier_document` | **Write** — Remove a document link from a supplier. |
| `reopen_hms_deviation` | **Write** — Reopen a resolved deviation. |
| `resolve_hms_deviation` | **Write** — Resolve a deviation with a resolution comment. |
| `search` | **Read** — Search meetings, tasks, documents and other Styrerommet records. |\n| `search_email_contracts` | **Read** — Search Styrerommet email for contracts and agreements. |\n| `search_emails` | **Read** — Search the configured Styrerommet mailbox. |
| `search_archive_files` | **Read** — Search archive names and document contents. |
| `search_invoices` | **Read** — Search invoices by supplier, date and other filters. |
| `set_supplier_favourite` | **Write** — Add or remove a supplier from the board's favorites. |
| `update_supplier_contact` | **Write** — Update a supplier contact. |
| `update_supplier_contract` | **Write** — Update a supplier contract. |
| `update_supplier_notes` | **Write** — Update internal supplier notes. |
| `vibbo_add_topic_form_draft` | **Write** — Create and attach a new form to an unpublished draft. |
| `vibbo_create_topic_draft` | **Write** — Create an unpublished resident handbook topic. |
| `vibbo_delete_topic_draft` | **Write** — Delete an unpublished resident handbook topic. |
| `vibbo_edit_topic_draft_sections` | **Write** — Insert, edit, move or remove sections in an unpublished draft. |
| `vibbo_get_activity_stream` | **Read** — Recent posts, comments and community activity. |
| `vibbo_get_assembly_proposals` | **Read** — Resident proposals for the general assembly. |
| `vibbo_get_event` | **Read** — Event details, RSVPs and comments. |
| `vibbo_get_news` | **Read** — The full content of a news article. |
| `vibbo_get_operation_schema` | **Read** — A Vibbo query's fields and parameters. |
| `vibbo_get_pending_applications` | **Read** — Resident applications awaiting board handling. |
| `vibbo_get_resident_statistics` | **Read** — Vibbo adoption and notification-consent statistics. |
| `vibbo_get_thread` | **Read** — Messages and details of a resident-to-board conversation. |
| `vibbo_get_topic` | **Read** — The full content of a resident handbook topic. |
| `vibbo_get_topic_draft` | **Read** — An unpublished topic's sections, forms and revision token. |
| `vibbo_get_topic_revision` | **Read** — The content and metadata of a topic revision. |
| `vibbo_get_transfer_applications` | **Read** — Subletting applications and their approval status. |
| `vibbo_graphql` | **Read** — Run a cataloged read-only Vibbo GraphQL query. |
| `vibbo_list_calendars` | **Read** — Shared facility calendars and reservations. |
| `vibbo_list_documents` | **Read** — Published resident documents and download links. |
| `vibbo_list_events` | **Read** — Community events, dates and publication status. |
| `vibbo_list_groups` | **Read** — Resident interest groups. |
| `vibbo_list_news` | **Read** — Published news and board announcements. |
| `vibbo_list_operations` | **Read** — Available read-only Vibbo GraphQL operations. |
| `vibbo_list_posts` | **Read** — Resident discussion posts. |
| `vibbo_list_residents` | **Read** — Vibbo residents, units, roles and contact details. |
| `vibbo_list_threads` | **Read** — Resident-to-board conversations and attachments. |
| `vibbo_list_topic_revisions` | **Read** — A topic's revision history. |
| `vibbo_list_topics` | **Read** — Published resident handbook topics. |
| `vibbo_remove_topic_form_draft` | **Write** — Detach a form from a draft; preserve the form and its answers. |
| `vibbo_update_topic_draft` | **Write** — Update an unpublished resident handbook topic. |
| `vibbo_update_topic_form_draft` | **Write** — Replace a draft form with an edited copy; preserve existing answers. |

</details>

## Development

Use **Node.js 26** and **pnpm 12.16.1**. From a checkout:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm start
```

## Releases

Use [Conventional Commits](https://www.conventionalcommits.org/) for PR titles and [SemVer](https://semver.org/) for versions. On a clean release branch, run `pnpm version patch --no-git-tag-version` (or `minor` / `major`); the version hook updates the desktop manifest automatically. Run `pnpm check`, then commit and merge all version changes to `main`.

Publish a [GitHub Release](https://github.com/tommydino/styrerommet-mcp/releases) with a new `vX.Y.Z` tag targeting that merged commit and generated release notes. Creating a GitHub Release does not bump the package version. The workflow tests the package and attaches the Claude Desktop bundle; the npm package `styrerommet-plus` is published with provenance through npm trusted publishing. Release notes are the changelog. For a dry run, use **Actions → Publish → Run workflow**. Leave existing release tags unchanged; use a new version to correct a release.

[MIT License](LICENSE).
