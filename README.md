# claude-mods

개인적으로 쓰는 Claude Code mod 모음입니다.

## where-am-i

지금 어느 브랜치, 어느 폴더에서 작업하는지와 컨텍스트를 얼마나 썼는지를 프롬프트 아래 줄에 보여줍니다.

```
? for shortcuts   main  ·  /Users/me/project/.claude/worktrees/fix-login          57% (570.1k / 1M)
```

- **왼쪽:** git 아이콘, 브랜치 이름, 저장소(또는 워크트리)의 절대 경로
  - detached HEAD일 때는 `detached <커밋>`으로 나옵니다.
  - git 저장소 밖에서는 나오지 않습니다.
- **오른쪽 끝:** 컨텍스트 사용량 (`사용률% (사용 토큰 / 컨텍스트 창 크기)`)
  - 캐시 읽기·쓰기와 비캐시 입력을 합친 값입니다.
  - 메인 턴이 끝날 때마다 갱신되고, 첫 응답이 오기 전에는 비어 있습니다.
- Bash 명령으로 브랜치를 바꾸거나 다른 터미널에서 바꿔도 턴이 끝날 때 다시 읽습니다.

### 필요한 것

- 터미널 폰트가 [Nerd Font](https://www.nerdfonts.com/)여야 합니다. 아니면 git 아이콘이 네모(□)로 보입니다.

## 설치

### GitHub에서 설치

Claude Code 안에서 실행합니다.

```
/plugin marketplace add HikiJun97/claude-mods
/plugin install where-am-i@claude-mods
```

터미널에서 하려면 이렇게 실행합니다.

```sh
claude plugin marketplace add HikiJun97/claude-mods
claude plugin install where-am-i@claude-mods
```

설치한 뒤 Claude Code 세션을 다시 시작하면 적용됩니다.

### 로컬 클론에서 설치

코드를 고쳐 가며 쓰려면 저장소를 클론해서 그 폴더를 마켓플레이스로 등록합니다.

```sh
git clone https://github.com/HikiJun97/claude-mods.git
claude plugin marketplace add ./claude-mods
claude plugin install where-am-i@claude-mods
```

## 업데이트

```sh
claude plugin marketplace update claude-mods
claude plugin update where-am-i@claude-mods
```

- 로컬 클론으로 설치했다면 먼저 그 폴더에서 `git pull`을 실행하세요.
- 업데이트는 세션을 다시 시작해야 적용됩니다.
- 설치본은 버전별로 캐시됩니다. 코드를 고쳤다면 `where-am-i/.claude-plugin/plugin.json`의 `version`을 올려야 업데이트로 잡힙니다.

## 개발

```sh
claude plugin test where-am-i      # 테스트
claude plugin validate where-am-i  # 매니페스트와 훅 모듈 검사
```

수정한 mod를 설치하지 않고 바로 써 보려면 `claude --plugin-dir ./where-am-i`로 세션을 엽니다.
