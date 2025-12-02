```md
```mermaid
flowchart TD
    Dev[Win11 + WSL\nReact / Node Dev]
    GitHub[GitHub Repo]

    subgraph Server[apelsin1 @ GleSYS]
        Nginx[Nginx\n:80 / :443]
        Apache[Apache\n:8081]
        Node[Node.js\n:3000]
        WP[WordPress]
        DB[(MariaDB\n:3306 internal\n:3307 dev access)]
    end

    Dev -->|git push| GitHub
    GitHub -->|git pull| Server

    Nginx --> Apache
    Nginx --> Node
    Apache --> WP
    WP --> DB
    Dev -->|DB connect| DB
