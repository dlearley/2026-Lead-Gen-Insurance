{{- define "common.secrets" -}}
apiVersion: v1
kind: Secret
metadata:
  name: {{ .Values.secrets.existingSecret }}
  labels:
    {{- include "common.labels" . | nindent 4 }}
type: Opaque
data:
  {{- range $key, $value := .Values.secrets.data }}
  {{ $key }}: {{ $value | b64enc | quote }}
  {{- end }}
{{- end }}
