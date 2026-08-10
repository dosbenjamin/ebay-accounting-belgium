{ pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;

    pnpm = {
      enable = true;
      package = pkgs.pnpm_11;
      install.enable = true;
    };
  };

  processes.app.exec = "pnpm dev";

  enterShell = ''
    echo "Node $(node --version) · pnpm $(pnpm --version)"
  '';
}
