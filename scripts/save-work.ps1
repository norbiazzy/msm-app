param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)
$ErrorActionPreference = "Stop"

git add -A
git status --short

git commit -m $Message
git push
