.PHONY: github

github:
	@if [ -z "$(CM)" ]; then \
		echo "Usage: make github CM=\"commit message\""; \
		exit 1; \
	fi
	@test "$$(git branch --show-current)" = main || { echo "Run make github from the main branch."; exit 1; }
	git add .
	git commit -m "$(CM)"
	git push origin main

scan:
	./scripts/container-scan.sh