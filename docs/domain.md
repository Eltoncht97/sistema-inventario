# Dominio del sistema de inventario

## Propósito

Este sistema administra el inventario de un único comercio y un único depósito.

Debe permitir registrar productos, consultar sus existencias y mantener un
historial auditable de todos los cambios de stock.

El sistema debe priorizar la consistencia del inventario: ninguna operación
puede producir stock negativo ni modificar el balance sin generar el
movimiento correspondiente.

## Alcance inicial

La primera versión incluye:

- Creación y consulta de productos.
- Actualización de los datos editables de un producto.
- Activación y desactivación de productos.
- Consulta del stock actual.
- Registro de entradas de stock.
- Registro de salidas de stock.
- Ajustes por conteo físico.
- Corrección de movimientos mediante movimientos compensatorios.
- Consulta del historial de movimientos de un producto.

El sistema opera inicialmente con un único comercio y un único depósito.

## Producto

Un producto representa un artículo administrado por el comercio.

Cada producto contiene:

- Un identificador interno.
- Un SKU único.
- Un nombre.
- Una descripción opcional.
- Un precio.
- Una moneda.
- Un estado activo o inactivo.
- Fecha de creación.
- Fecha de última actualización.

### Reglas del producto

- El SKU debe ser único.
- El SKU no se puede modificar después de crear el producto.
- El nombre es obligatorio.
- El precio no puede ser negativo.
- La moneda sólo puede ser PEN o USD.
- No se realizan conversiones entre monedas.
- Un producto nuevo comienza con stock cero.
- Un producto sólo puede desactivarse cuando su stock es cero.
- Un producto inactivo conserva su información y su historial.
- Un producto inactivo no puede recibir nuevos movimientos de stock.
- Un producto inactivo puede reactivarse.

## Existencia

La existencia representa la cantidad actual disponible de un producto.

Aunque inicialmente exista un solo depósito, la existencia se considera un
concepto separado del producto. Esta separación permitirá incorporar varios
depósitos en el futuro.

### Reglas de la existencia

- Cada producto tiene un único balance de stock.
- El balance inicial es cero.
- El balance se almacena actualizado para permitir consultas rápidas.
- El balance nunca puede ser negativo.
- Las cantidades se expresan inicialmente en unidades enteras.
- El balance no puede modificarse directamente.
- Todo cambio de balance debe producir un movimiento de stock.
- El balance y su movimiento deben guardarse en una misma transacción.

El historial de movimientos permite auditar y comprobar el balance actual.
Si existiera una diferencia entre ambos, el sistema deberá considerarla una
inconsistencia que necesita investigación.

## Movimiento de stock

Un movimiento representa un cambio inmutable en la existencia de un producto.

Cada movimiento contiene conceptualmente:

- Un identificador.
- El producto afectado.
- El tipo de movimiento.
- La variación aplicada al stock.
- El balance anterior.
- El balance resultante.
- Un motivo o descripción.
- La fecha y hora de creación.
- Una referencia al movimiento original cuando sea compensatorio.

Los movimientos no se editan ni se eliminan.

## Entrada

Una entrada incrementa el stock de un producto.

Ejemplos:

- Recepción de mercadería.
- Incorporación de stock inicial.
- Devolución de unidades al inventario.

### Reglas de entrada

- La cantidad solicitada debe ser mayor que cero.
- El producto debe existir.
- El producto debe estar activo.
- El movimiento registra una variación positiva.
- El balance resultante debe coincidir con el balance anterior más la entrada.

## Salida

Una salida reduce el stock de un producto.

Ejemplos:

- Entrega de mercadería.
- Pérdida registrada.
- Retiro autorizado del inventario.

### Reglas de salida

- La cantidad solicitada debe ser mayor que cero.
- El producto debe existir.
- El producto debe estar activo.
- Debe existir stock suficiente.
- El movimiento registra una variación negativa.
- El balance resultante nunca puede ser negativo.
- El balance resultante debe coincidir con el balance anterior menos la salida.

Una salida no equivale a eliminar un movimiento. Es una nueva operación del
negocio que reduce el inventario.

## Ajuste

Un ajuste sincroniza el sistema con el resultado de un conteo físico.

La operación recibe la cantidad real encontrada, no la diferencia calculada
manualmente por el usuario.

Ejemplo:

- El sistema indica 10 unidades.
- El conteo físico encuentra 7.
- La operación solicita establecer la existencia en 7.
- El sistema genera un movimiento de ajuste con una variación de -3.

### Reglas de ajuste

- La cantidad resultante no puede ser negativa.
- El producto debe existir.
- El producto debe estar activo.
- El sistema calcula la diferencia entre el balance actual y la cantidad
  encontrada.
- El motivo del ajuste es obligatorio.
- Un ajuste que no cambia la cantidad no debe generar un movimiento.

## Movimiento compensatorio

Un movimiento compensatorio corrige el efecto de un movimiento anterior sin
alterarlo ni eliminarlo.

Ejemplo:

- Se registró por error una entrada de 10 unidades.
- La corrección crea un movimiento compensatorio de -10.
- Ambos movimientos permanecen visibles en el historial.

### Reglas de compensación

- El movimiento original permanece inmutable.
- La compensación debe referenciar el movimiento original.
- El motivo de la corrección es obligatorio.
- No se puede compensar dos veces el mismo movimiento.
- La compensación debe respetar la regla que impide stock negativo.
- La corrección y la actualización del balance deben ser atómicas.

## Reglas e invariantes

Las siguientes condiciones deben cumplirse siempre:

1. El SKU de un producto es único.
2. El stock nunca puede ser negativo.
3. Las cantidades de entrada y salida deben ser mayores que cero.
4. Un ajuste no puede establecer una cantidad negativa.
5. El precio no puede ser negativo.
6. La moneda sólo puede ser PEN o USD.
7. Un producto inactivo no admite movimientos.
8. Un producto sólo puede desactivarse con stock cero.
9. Cada cambio de stock produce un movimiento.
10. El balance y el movimiento se guardan en una única transacción.
11. Los movimientos son inmutables.
12. Las correcciones se realizan mediante movimientos compensatorios.
13. Un movimiento sólo puede compensarse una vez.
14. El balance registrado debe poder verificarse mediante el historial.

## Casos de uso iniciales

### Productos

- Crear un producto.
- Consultar un producto por identificador.
- Consultar un producto por SKU.
- Listar productos.
- Actualizar nombre, descripción o precio.
- Desactivar un producto sin stock.
- Reactivar un producto.

### Inventario

- Consultar el stock actual de un producto.
- Registrar una entrada.
- Registrar una salida.
- Registrar un ajuste por conteo físico.
- Compensar un movimiento incorrecto.
- Consultar el historial de movimientos.

## Errores de dominio esperados

El sistema debe rechazar explícitamente:

- La creación de un SKU duplicado.
- Una entrada o salida con cantidad cero o negativa.
- Una salida sin stock suficiente.
- Un ajuste con cantidad negativa.
- Un movimiento sobre un producto inexistente.
- Un movimiento sobre un producto inactivo.
- La desactivación de un producto con stock disponible.
- La modificación o eliminación de un movimiento.
- La compensación repetida de un mismo movimiento.
- Una compensación que produciría stock negativo.
- Una moneda distinta de PEN o USD.

## Fuera de alcance

La primera versión no incluye:

- Múltiples comercios.
- Múltiples depósitos.
- Transferencias entre depósitos.
- Usuarios, autenticación o permisos.
- Proveedores.
- Compras.
- Ventas o pedidos.
- Reservas de stock.
- Conversión de monedas.
- Importaciones masivas.
- Reportes asíncronos.
- Redis.
- Colas o workers.
- Microservicios.
- Despliegue en AWS.

Estas capacidades podrán incorporarse en sprints posteriores cuando exista un
requisito concreto que las justifique.