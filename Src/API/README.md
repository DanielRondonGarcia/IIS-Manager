# IIS Manager API - Guía de Despliegue

Esta API permite gestionar sitios y Application Pools de IIS (listar, reiniciar sitios, reciclar pools).

## ⚠️ Solución al Error "HTTP Error 500.31 - Failed to load ASP.NET Core runtime"

Si ves este error al intentar acceder a la API, significa que el servidor **no tiene instalado el Runtime de .NET necesario**.

La aplicación está construida en **.NET 9.0**.

### Pasos para solucionar:

1.  **Descargar el Hosting Bundle**:
    *   Ve al sitio oficial de Microsoft: [Descargar .NET 9.0](https://dotnet.microsoft.com/es-es/download/dotnet/9.0)
    *   Busca la sección **ASP.NET Core Runtime** > **Hosting Bundle** (para Windows).
    *   Descarga e instala este ejecutable en el servidor IIS.

2.  **Reiniciar IIS**:
    *   Después de instalar el bundle, es posible que necesites reiniciar IIS para que reconozca el nuevo runtime.
    *   Ejecuta en consola (CMD/PowerShell) como Administrador:
        ```powershell
        iisreset
        ```

---

## 📋 Requisitos del Servidor

*   **Sistema Operativo**: Windows Server con IIS habilitado.
*   **Runtime**: .NET 9.0 (Hosting Bundle).
*   **Permisos de Usuario**:
    *   El **Application Pool** donde se ejecute esta API debe tener privilegios elevados para poder reiniciar otros sitios.
    *   **Opción Recomendada**: Cambiar la identidad del AppPool de esta API a `LocalSystem` o a una cuenta de usuario con permisos de Administrador.
    *   *Nota*: Si se ejecuta con la identidad por defecto (`ApplicationPoolIdentity`), es probable que la API pueda "leer" la información pero falle al intentar "reiniciar" o "reciclar" debido a falta de permisos.

## 🚀 Guía de Instalación (Paso a Paso)

1.  **Publicar la Aplicación**:
    Genera los archivos para despliegue ejecutando el siguiente comando en tu máquina de desarrollo:
    ```powershell
    dotnet publish -c Release -o C:\Deploy\IisManagerApi
    ```

2.  **Copiar Archivos**:
    Copia el contenido de la carpeta `C:\Deploy\IisManagerApi` al servidor.

3.  **Configurar IIS**:
    *   Crea un nuevo Sitio o Aplicación en IIS apuntando a la carpeta copiada.
    *   Asegúrate de que el **Application Pool** esté configurado para usar código **No Managed Code** (o CLR integrado, aunque para .NET Core/5+ se suele poner "Sin código administrado" ya que Kestrel maneja el proceso, pero el Hosting Bundle se encarga del puente).
    
4.  **Verificar Permisos**:
    *   Ve a la configuración avanzada del Application Pool de esta API.
    *   En **Identity** (Identidad), cambia a `LocalSystem` (o una cuenta admin) para garantizar que pueda controlar el servicio WWW.

## 📡 Endpoints Disponibles

*   `GET /api/iis?filter=texto` : Listar sitios (filtro opcional).
*   `POST /api/sites/{name}/restart` : Reiniciar un sitio web raíz.
*   `POST /api/pools/{name}/recycle` : Reciclar un Application Pool.
