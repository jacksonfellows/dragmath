let sampleEqn = ['=', ['*', [-1, 'd'], [1, ['+', [1, 'a'], [1, ['*', [1, 'x'], [1, 'z']]], [-1, 'f']]]], ['+', [1, 'c'], [1, '5']]];

function renderOp(op) {
	let e = document.createElement('span');
	e.className = 'op';
	e.innerText = op;
	return e;
}

function renderAtom(atom) {
	let e = document.createElement('span');
	e.className = 'atom';
	e.innerText = atom;
	return e;
}

function renderParen(paren) {
	let e = document.createElement('span');
	e.className = 'paren';
	e.innerText = paren;
	return e;
}

function wrapIf(node, cond) {
	if (cond) {
		let e = document.createElement('span');
		e.appendChild(renderParen('('));
		e.appendChild(node);
		e.appendChild(renderParen(')'));
		return e;
	} else {
		return node;
	}
}

function makeFrac(numerator, denominator) {
	let e = document.createElement('div');
	e.className = 'fraction';
	e.appendChild(numerator);

	let bar = document.createElement('hr');
	e.appendChild(bar);
	
	e.appendChild(denominator);
	return e;
}

function renderExpr(expr, level, side) {
	if (Array.isArray(expr)) {
		let op = expr[0];
		if (op == '+') {
			let e = document.createElement('span');
			for (let i = 1; i < expr.length; i++) {
				let [coef, childExpr] = expr[i];
				console.assert(coef == 1 || coef == -1);
				if (coef == -1) {
					e.appendChild(renderOp('-'));
				} else if (i != 1) {
					e.appendChild(renderOp('+'));
				}
				let child = renderExpr(childExpr, level + 1);
				if (level == 1) {
					child.draggable = true;
					child.ondragstart = (ev) => {
						ev.dataTransfer.setData('text/plain', side + ' ' + i);
					};
				}
				e.appendChild(child);
			}
			return e;
		} else if (op == '*') {
			let numerator = document.createElement('span');
			let denominator = document.createElement('span');
			for (let i = 1; i < expr.length; i++) {
				let [coef, childExpr] = expr[i];
				console.assert(coef == 1 || coef == -1);
				let child = wrapIf(renderExpr(childExpr, level + 1), Array.isArray(childExpr) && childExpr[0] == '+');				
				if (level == 1) {
					child.draggable = true;
					child.ondragstart = (ev) => {
						ev.dataTransfer.setData('text/plain', side + ' ' + i);
					};
				}
				if (coef == 1) {
					if (numerator.children.length > 0) {
						numerator.appendChild(renderOp('*'));
					}
					numerator.appendChild(child);
				} else if (coef == -1) {
					denominator.appendChild(child);
				}
			}
			if (numerator.children.length == 0) {
				return makeFrac(renderAtom(1), denominator);
			} else if (denominator.children.length == 0) {
				return numerator;
			} else {
				return makeFrac(numerator, denominator);
			}
		}
	} else {
		return renderAtom(expr);
	}
}

function simplifyExpr(expr) {
	if (Array.isArray(expr)) {
		console.assert(expr[0] == '+' || expr[0] == '*', expr);
		if (expr.length == 1) {
			if (expr[0] == '+') {
				return 0;
			} else if (expr[0] == '*') {
				return 1;
			}
		} else if (expr.length == 2) {
			let [coef,childExpr] = expr[1];
			if (coef == 1) {
				return simplifyExpr(childExpr);
			} else if (expr[0] == '+' && coef == -1) {
				return ['*', [1,-1], [1,simplifyExpr(childExpr)]];
			} else {
				return [expr[0], [coef,simplifyExpr(childExpr)]];
			}
		} else {
			let simplified = [expr[0]];
			for (let i = 1; i < expr.length; i++) {
				let [coef,childExpr] = expr[i];
				simplified.push([coef,simplifyExpr(childExpr)]);
			}
			return simplified;
		}
	} else {
		return expr;
	}
}

function simplify(eqn) {
	return ['=', simplifyExpr(eqn[1]), simplifyExpr(eqn[2])];
}

function move(eqn, srcSide, srcElem, dstSide) {
	let newEqn = structuredClone(eqn);
	console.assert(Array.isArray(newEqn[srcSide]));

	let [coef,elem] = newEqn[srcSide].splice(srcElem, 1)[0];
	if (Array.isArray(newEqn[dstSide]) && newEqn[srcSide][0] == newEqn[dstSide][0]) {
		newEqn[dstSide].push([-1*coef, elem]);
	} else {
		newEqn[dstSide] = [newEqn[srcSide][0], [1, newEqn[dstSide]], [-1*coef, elem]];
	}

	newEqn = simplify(newEqn);
	console.log('move', eqn, newEqn);
	return newEqn;
}

function renderEqn(eqn) {
	console.assert(eqn[0] == '=');
	let lhs = renderExpr(eqn[1], 1, 1);
	let rhs = renderExpr(eqn[2], 1, 2);

	for (let i = 1; i <= 2; i++) {
		let side = [lhs, rhs][i-1];
		side.ondragover = (ev) => {
			ev.preventDefault();
		};
		side.ondrop = (ev) => {
			ev.preventDefault();
			let [srcSide,srcElem] = ev.dataTransfer.getData('text/plain').split(' ').map(x => parseInt(x));
			if (i != srcSide) {
				setEqn(move(eqn, srcSide, srcElem, i));
			}
		};
	}

	let e = document.createElement('div');
	e.appendChild(lhs);
	e.appendChild(renderOp('='));
	e.appendChild(rhs);
	return e;
}

function setEqn(newEqn) {
	let eqnDiv = document.getElementById('eqn');
	while (eqnDiv.hasChildNodes()) {
		eqnDiv.removeChild(eqnDiv.firstChild);
	}
	eqnDiv.appendChild(renderEqn(newEqn));	
}

window.addEventListener('DOMContentLoaded', () => {
	setEqn(sampleEqn);
});