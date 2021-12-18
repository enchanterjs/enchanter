import Path from "path"
import { GitFileStore } from "../git-file-store"
import * as GitFileStores from "../git-file-stores"

export class GitLink {
  host: string
  repo: string
  path: string

  constructor(opts: { host: string; repo: string; path?: string }) {
    this.host = opts.host
    this.repo = opts.repo
    this.path = opts.path || ""
  }

  encode(): string {
    let s = this.repo

    if (this.host) {
      s = `${this.host}/` + s
    }

    if (this.path) {
      s = s + `/-/${this.path}`
    }

    return s
  }

  static decode(str: string): GitLink {
    const [host_and_repo, path] = str.split("/-/")
    const [host, ...repo] = host_and_repo.split("/")
    return new GitLink({ host, repo: repo.join("/"), path })
  }

  formatURL(): string {
    switch (this.host) {
      case "github.com":
        return this.path
          ? `https://github.com/${this.repo}/tree/master/${this.path}`
          : `https://github.com/${this.repo}`
      case "gitlab.com":
        return this.path
          ? `https://gitlab.com/${this.repo}/-/tree/master/${this.path}`
          : `https://gitlab.com/${this.repo}`
      default:
        return this.path
          ? `https://${this.host}/${this.repo}/-/tree/master/${this.path}`
          : `https://${this.host}/${this.repo}`
    }
  }

  upward(): GitLink {
    const { host, repo, path } = this
    const dirname = Path.dirname(path)
    const dir = dirname === "." ? "" : dirname
    return new GitLink({ host, repo, path: dir })
  }

  resolve(path: string): GitLink {
    const prefix = "placeholder:/"

    return new GitLink({
      host: this.host,
      repo: this.repo,
      path: new URL(path, `${prefix}${this.path}`).href.slice(prefix.length),
    })
  }

  createGitFileStore(): GitFileStore {
    const { host, repo, path: dir } = this

    switch (host) {
      case "github.com":
        return new GitFileStores.GitHubFileStore(repo, { dir })
      case "gitlab.com":
        return new GitFileStores.GitLabFileStore(repo, { dir })
      case "gitee.com":
        return new GitFileStores.GiteeFileStore(repo, { dir })
      default:
        return new GitFileStores.GitLabFileStore(repo, { dir, host })
    }
  }

  static fromURL(input: string): GitLink {
    const { host, pathname } = new URL(input)

    const middle = pathname.includes("/-/")
      ? "/-/tree/master/" // NOTE for gitlab
      : "/tree/master/" // NOTE for gihub and some version of gitlab

    const [repo, path] = pathname
      .slice(1)
      .replace("/blob/master/", "/tree/master/")
      .split(middle)

    return new GitLink({ host, repo, path })
  }
}