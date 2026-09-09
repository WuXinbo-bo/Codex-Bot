# Reserved workbench integration

The production coordinator does not connect to a workbench by default, even if an
old config enables it. No discovery or endpoint probing is performed without an adapter.

Integrators may pass `workbenchAdapter` to `startCoordinator` and explicitly enable
`config.workbench.enabled`. Implement an asynchronous, read-only `snapshot()`:

```js
return {
  baseUrl: 'https://your-service.example',
  bootstrap: { workspaces: [{ id: 'project-id', name: 'Project' }] },
  sessions: [{ id: 'task-id', workspaceId: 'project-id', title: 'Task',
    status: 'running', updatedAt: new Date().toISOString(), engine: 'Provider' }]
};
```

Adapter responsibilities: authentication, validation, request timeout, cancellation,
and provider-to-standard lifecycle mapping. Throw on failure; never return fake idle
state for a network error. Do not include credentials in errors or display fields.
The coordinator handles scheduling, health, stale state and notices. Task-opening URL
policy must be reviewed separately before enabling a third-party integration.

Existing Rust/legacy workbench implementations remain compatibility code, not a public
network ingestion endpoint. This interface does not start a server or accept remote writes.
