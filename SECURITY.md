# Política de seguridad

## Reportar una vulnerabilidad

Si descubres una vulnerabilidad de seguridad en Luna, por favor repórtala abriendo un issue de GitHub o contactando al mantenedor directamente.

## Alcance

Esta política aplica a:

- La app web alojada en `luna.ai` y sus subdominios
- La app de escritorio publicada en GitHub Releases
- El código fuente en este repositorio

## Qué reportar

Por favor reporta:

- Vulnerabilidades de inyección (XSS, CSRF, inyección de SQL/NoSQL)
- Problemas de autenticación o autorización
- Divulgación de información sensible
- Vulnerabilidades de dependencias de terceros
- Cualquier problema que pueda comprometer la privacidad de los usuarios

## Cómo reportar

1. **No** abras un issue público para vulnerabilidades de seguridad
2. Envía un email a [seguridad@luna.ai](mailto:seguridad@luna.ai) con:
   - Una descripción clara de la vulnerabilidad
   - Pasos para reproducirla
   - Impacto potencial
   - Cualquier corrección sugerida
3. O abre un issue privado en GitHub si lo prefieres

## Respuesta

- Confirmaremos recepción en 48 horas
- Proporcionaremos un plan de acción en 7 días
- Trabajaremos contigo para resolver la vulnerabilidad antes de hacerla pública
- Agradeceremos tu contribución en las notas de la versión (a menos que prefieras mantener el anonimato)

## Cifrado de datos

Luna almacena datos localmente en tu dispositivo usando IndexedDB. Los datos nunca se envían a nuestros servidores excepto cuando:

- Usas un proveedor de IA en la nube (tus mensajes van directamente a ese proveedor)
- Usas la app web (las peticiones pueden retransmitirse a través de nuestros servidores)

Las claves API se almacenan localmente y nunca se envían a nuestros servidores.

## Actualizaciones de seguridad

Las actualizaciones de seguridad se publican en GitHub Releases y se anuncian en el blog. La app de escritorio recibe actualizaciones automáticas.

## Agradecimientos

Agradecemos a los investigadores de seguridad que reportan vulnerabilidades de manera responsable.
