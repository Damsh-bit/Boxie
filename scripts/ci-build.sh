#!/usr/bin/env bash
# Build del CI (.github/workflows/ci.yml).
#
# Si falla, las últimas líneas del build quedan en una anotación del run: se
# leen en el resumen (y por la API) sin iniciar sesión en GitHub. Reintenta
# una vez, porque hay fallas pasajeras de red (por ejemplo, al bajar las
# tipografías de Google Fonts): la primera queda como advertencia, así se ve
# la causa aunque el job termine bien.
set -o pipefail

log="${RUNNER_TEMP:-/tmp}/build.log"

annotate() {
  local level="$1" title="$2"
  local tail_text
  tail_text=$(
    tail -n 400 "$log" |
      sed -r 's/\x1b\[[0-9;]*[A-Za-z]//g' |
      grep -v '"level":"warn"' |
      tail -n 45 |
      sed -e 's/%/%25/g' -e 's/\r//g' |
      awk 'BEGIN { ORS = "%0A" } { print }'
  )
  echo "::${level} title=${title}::${tail_text}"
}

if npm run build 2>&1 | tee "$log"; then
  exit 0
fi

annotate warning "Falló el build (primer intento, se reintenta)"
echo "El build falló: se reintenta una vez."

if npm run build 2>&1 | tee "$log"; then
  exit 0
fi

annotate error "Falló el build"
exit 1
