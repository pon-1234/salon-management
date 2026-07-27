# Release checklist

## Search indexing

The preview environment must remain non-indexable. Before a public storefront release:

- Confirm the release owner has approved indexing for the target environment.
- Remove or environment-gate the application `robots` metadata that sets `index: false`.
- Remove the edge/proxy `x-robots-tag: noindex, nofollow, noarchive` header at the same release.
- Verify `/robots.txt`, page metadata, and response headers from the public origin.
- Keep `/admin`, `/cast`, authentication, and account routes non-indexable.

Do not change only one of the application and edge controls; either one can keep the storefront out
of search results.
